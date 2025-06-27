import { HttpService } from '@nestjs/axios';
import { readFileSync } from 'fs';
import { Command } from 'nest-commander';
import { CommandRunner } from 'nest-commander';
import { launchBrowser } from '../../utils/browser.util';
import { Page } from 'playwright-core';
import { Audience } from './post-tiktok.enum';
import * as os from 'os';

type PostTiktokCommandInputs = {
  show_browser: boolean;
  is_close_browser: boolean;
  video_path: string;
  description: string;
  audience: keyof typeof Audience;
  is_ai_generated: boolean;
  run_copyright_check: boolean;
  is_comment_on: boolean;
  is_duet_on: boolean;
  is_stitch_on: boolean;
};

@Command({
  name: 'post-tiktok',
  description: 'Post a TikTok video',
  arguments: '<file-settings>',
})
export class PostTiktokCommand extends CommandRunner {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async run(inputs: string[]) {
    const pathFileSetting = inputs[0];
    const fileSettings = JSON.parse(
      readFileSync(pathFileSetting, 'utf8'),
    ) as PostTiktokCommandInputs;

    const browser = await launchBrowser(fileSettings.show_browser);

    try {
      const page = await browser.newPage();

      await page.goto('https://www.tiktok.com/tiktokstudio/upload', {
        waitUntil: 'networkidle',
      });

      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        console.log('Please login to TikTok');
        if (!fileSettings.show_browser) {
          throw new Error('Please set show_browser to true to login to TikTok');
        }
      }

      try {
        const cancelDraftButton = page.getByRole('button', { name: 'Hủy bỏ' });
        if (await cancelDraftButton.isVisible({ timeout: 2000 })) {
          await cancelDraftButton.click();

          await page.waitForSelector(
            '.common-modal-footer .TUXButton-label:text("Hủy bỏ")',
            {
              timeout: 3000,
            },
          );

          await page
            .locator('.common-modal-footer .TUXButton-label:text("Hủy bỏ")')
            .click();
        }
      } catch (e) {
        console.log('No draft cancel popup', e);
      }

      await page.setInputFiles('input[type="file"]', fileSettings.video_path);

      await page.waitForSelector(
        '.info-body .info-main span[data-icon="CheckCircleFill"]',
      );

      await this.setDescription(page, fileSettings.description);

      await this.selectDropdownById(page, Audience[fileSettings.audience]);

      await page.locator('.more-btn').click();

      await this.clickCheckboxByIndex(page, 0, fileSettings.is_comment_on);
      await this.clickCheckboxByIndex(page, 1, fileSettings.is_duet_on);
      await this.clickCheckboxByIndex(page, 2, fileSettings.is_stitch_on);

      await this.setSwitchAIGenerated(page, fileSettings.is_ai_generated);

      await this.setSwitchCopyright(page, fileSettings.run_copyright_check);

      await page
        .locator('.footer button[data-e2e="post_video_button"]')
        .click();

      console.log('Done');
    } catch (error) {
      console.error(error);
    } finally {
      if (fileSettings.is_close_browser) {
        await browser.close();
      }
    }
  }

  private async setDescription(page: Page, description: string) {
    const platform = os.platform();
    const selectAllShortcut = platform === 'darwin' ? 'Meta+A' : 'Control+A';
    await page.click('.public-DraftEditor-content');
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.press('Backspace');
    await page.type('.public-DraftEditor-content', description);
  }

  private async clickCheckboxByIndex(
    page: Page,
    index: number,
    value: boolean,
  ) {
    const labels = page.locator('.checkbox-container label');
    const label = labels.nth(index);
    const checkbox = label.locator('input[type="checkbox"]');
    const isChecked = await checkbox.isChecked();

    const isDisabled = await checkbox.isDisabled();

    if (isDisabled) {
      return;
    }

    if (isChecked !== value) {
      await label.click();
    }
  }

  private async setSwitchAIGenerated(page: Page, checked: boolean) {
    const toggle = page.locator('[data-e2e="aigc_container"] .Switch__content');
    const current = await toggle.getAttribute('aria-checked');
    if ((checked && current === 'false') || (!checked && current === 'true')) {
      await toggle.click();
    }

    if (checked) {
      try {
        const modalFooter = page.locator('.common-modal-footer');
        await modalFooter.waitFor({ state: 'visible', timeout: 500 });

        const primaryButton = modalFooter.locator(
          'button[data-type="primary"]',
        );

        await primaryButton.click({
          timeout: 500,
        });
      } catch (e: unknown) {
        console.log('No modal footer', (e as Error).message);
      }
    }
  }

  private async selectDropdownById(page: Page, optionId: number) {
    const escapedId = `option-\\"${optionId}\\"`;

    await page
      .locator('.view-auth-container .Select__root button.Select__trigger')
      .click();

    await page.locator(`[id=${escapedId}]`).click();
  }

  private async setSwitchCopyright(page: Page, checked: boolean) {
    const switchContent = page.locator('.copyright-check .Switch__content');

    const isDisabled = await switchContent.getAttribute('data-disabled');
    if (isDisabled === 'true') {
      console.warn('⚠️ Switch is disabled. Cannot change state.');
      return;
    }

    const current = await switchContent.getAttribute('aria-checked');
    if ((checked && current === 'false') || (!checked && current === 'true')) {
      await switchContent.click();

      try {
        // await page.locator('.copyright-check .tool-tip.success').waitFor({
        //   state: 'visible',
        //   timeout: 80000, // 80s
        // });

        const checkingIcon = page.locator('.tool-tip [data-icon="Hourglass"]');
        await checkingIcon.waitFor({ state: 'visible', timeout: 5000 });

        await checkingIcon.waitFor({
          state: 'hidden',
          timeout: 80000,
        });

        const successIcon = page.locator(
          '.tool-tip.success [data-icon="Check"]',
        );
        if (await successIcon.isVisible({ timeout: 2000 })) {
          console.log('🎉 Success icon detected. Done!');
          return;
        }
      } catch (error) {
        console.log('No success tooltip', (error as Error).message);
      }
    }
  }
}
