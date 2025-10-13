import { HttpService } from '@nestjs/axios';
import { readFileSync } from 'fs';
import { Command } from 'nest-commander';
import { CommandRunner } from 'nest-commander';
import { launchBrowser } from '../../utils/browser.util';
import { Locator, Page } from 'playwright-core';
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
  is_auto_use_music: boolean;
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
        { timeout: 10000 },
      );

      if (fileSettings.is_auto_use_music) {
        await this.clickEditVideoButton(page);
      }

      await this.setDescription(page, fileSettings.description);

      await this.selectDropdownById(page, Audience[fileSettings.audience]);

      await page.locator('.more-btn').click();

      await this.clickCheckboxByIndex(page, 0, fileSettings.is_comment_on);
      await this.clickCheckboxByIndex(page, 1, fileSettings.is_duet_on);

      await this.setSwitchAIGenerated(page, fileSettings.is_ai_generated);

      await this.setSwitchCopyright(page, true);

      await this.setSwitchContentCheckLite(page, true);

      await page
        .locator('.footer button[data-e2e="post_video_button"]')
        .click();

      await this.handleContentWarningModal(page);

      await page.waitForURL('https://www.tiktok.com/tiktokstudio/content');

      console.log('Done');
    } catch (error) {
      console.log('Can not post video');
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
    const wrapper = page.locator('.copyright-check');
    const switchContent = wrapper.locator('.Switch__content');

    const isDisabled = await switchContent.getAttribute('data-disabled');
    if (isDisabled === 'true') {
      console.log('⚠️ Switch is disabled. Cannot change state.');
      return;
    }

    const current = await switchContent.getAttribute('aria-checked');
    if ((checked && current === 'false') || (!checked && current === 'true')) {
      await switchContent.click();
    }

    await this.waitForCopyrightStatusResult(page, wrapper, 'copyright check');
  }

  private async waitForCopyrightStatusResult(
    page: Page,
    wrapper: Locator,
    checkType: string,
  ) {
    const statusWrapper = wrapper.locator('.status-wrapper');

    const maxWaitTime = 600000; // 10 phút
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const errorStatus = statusWrapper.locator(
          '.status-result.status-error',
        );
        if (await errorStatus.isVisible({ timeout: 1000 })) {
          const errorMessage = await errorStatus
            .locator('.status-tip')
            .textContent();
          const errorText = `${checkType} failed: ${errorMessage}`;
          console.error(`❌ ${errorText}`);
          throw new Error(`❌ ${errorText}`);
        }

        const warnStatus = statusWrapper.locator('.status-result.status-warn');
        if (await warnStatus.isVisible({ timeout: 1000 })) {
          const warnMessage = await warnStatus
            .locator('.status-tip')
            .textContent();
          const warningText = `${checkType} warning: ${warnMessage}`;
          console.warn(`⚠️ ${warningText}`);
          return;
        }

        const successStatus = statusWrapper.locator(
          '.status-result.status-success',
        );
        if (await successStatus.isVisible({ timeout: 1000 })) {
          const successMessage = await successStatus
            .locator('.status-tip')
            .textContent();
          console.info(`🎉 ${checkType} success: ${successMessage}`);
          return;
        }

        const checkingStatus = statusWrapper.locator(
          '.status-result.status-checking',
        );
        if (await checkingStatus.isVisible({ timeout: 1000 })) {
          console.info(`⏳ ${checkType} is still checking...`);
          await page.waitForTimeout(5000);
          continue;
        }

        await page.waitForTimeout(2000);
      } catch (error) {
        console.log('Error in waitForCopyrightStatusResult', error);
        if (error instanceof Error && error.message.includes('failed')) {
          throw error;
        }
        await page.waitForTimeout(2000);
      }
    }

    throw new Error(`⏰ ${checkType} timeout after 10 minutes`);
  }

  private async setSwitchContentCheckLite(page: Page, checked: boolean) {
    const wrapper = page.locator('.headline-wrapper');
    const switchContent = wrapper.locator('.headline-switch .Switch__content');

    const isDisabled = await switchContent.getAttribute('data-disabled');
    if (isDisabled === 'true') {
      console.log('⚠️ Switch is disabled. Cannot change state.');
      return;
    }

    const current = await switchContent.getAttribute('aria-checked');
    if ((checked && current === 'false') || (!checked && current === 'true')) {
      await switchContent.click();
    }

    await this.waitForStatusResult(page, wrapper, 'content check');
  }

  private async waitForStatusResult(
    page: Page,
    wrapper: Locator,
    checkType: string,
  ) {
    const parent = wrapper.locator('..');
    const statusWrapper = parent.locator('.status-wrapper');

    const maxWaitTime = 600000; // 10 phút
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const errorStatus = statusWrapper.locator(
          '.status-result.status-error[data-show="true"]',
        );
        if (await errorStatus.isVisible({ timeout: 1000 })) {
          const errorMessage = await errorStatus
            .locator('.status-tip')
            .textContent();
          const errorText = `${checkType} failed: ${errorMessage}`;
          console.log(`❌ ${errorText}`);
          console.log(errorText);
          throw new Error(`❌ ${errorText}`);
        }

        const warnStatus = statusWrapper.locator(
          '.status-result.status-warn[data-show="true"]',
        );
        if (await warnStatus.isVisible({ timeout: 1000 })) {
          const warnMessage = await warnStatus
            .locator('.status-tip')
            .textContent();
          console.log(`${checkType} warning: ${warnMessage}`);
          return;
        }

        const successStatus = statusWrapper.locator(
          '.status-result.status-success[data-show="true"]',
        );
        if (await successStatus.isVisible({ timeout: 1000 })) {
          const successMessage = await successStatus
            .locator('.status-tip')
            .textContent();
          console.log(`🎉 ${checkType} success: ${successMessage}`);
          return;
        }

        const checkingStatus = statusWrapper.locator(
          '.status-result.status-checking[data-show="true"]',
        );
        if (await checkingStatus.isVisible({ timeout: 1000 })) {
          console.log(`⏳ ${checkType} is still checking...`);
          await page.waitForTimeout(5000);
          continue;
        }

        await page.waitForTimeout(2000);
      } catch (error) {
        if (error instanceof Error && error.message.includes('failed')) {
          throw error;
        }
        await page.waitForTimeout(2000);
      }
    }

    throw new Error(`⏰ ${checkType} timeout after 10 minutes`);
  }

  private async clickEditVideoButton(page: Page) {
    try {
      console.log('🎬 Looking for Edit video button...');

      await page.waitForTimeout(3000);

      const editVideoButton = page.locator('button:has-text("Edit video")');
      await editVideoButton.click();

      const modalEditVideo = page.locator(
        '.TUXModal.common-modal[role="dialog"]',
      );
      await modalEditVideo.waitFor({ state: 'visible', timeout: 10000 });

      await page.waitForSelector('.music-card-container', {
        timeout: 15000,
        state: 'visible',
      });

      // Hover vào music card container đầu tiên để hiển thị button "Use"
      console.log('🎵 Hovering over first music card to show Use button...');
      const firstMusicCard = page.locator('.music-card-container').first();
      await firstMusicCard.hover();

      // Chờ button "Use" xuất hiện và click vào nó
      console.log('🎵 Looking for Use button...');
      const useButton = page
        .locator('.music-card-container')
        .first()
        .locator('button:has-text("Use")');
      await useButton.waitFor({ state: 'visible', timeout: 5000 });
      await useButton.click();

      console.log('✅ Successfully clicked Use button for music');

      // Click vào button "Save edit" để lưu thay đổi
      console.log('💾 Looking for Save edit button...');
      const saveEditButton = page.locator(
        'button[data-e2e="editor_save_button"]',
      );
      await saveEditButton.waitFor({ state: 'visible', timeout: 5000 });
      await saveEditButton.click();

      console.log('✅ Successfully saved edit');

      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('❌ Error clicking Edit video button:', error);
      throw error;
    }
  }

  private async handleContentWarningModal(page: Page) {
    try {
      const warningModal = page.locator(
        '.TUXModal.common-modal[role="dialog"]',
      );

      if (await warningModal.isVisible({ timeout: 5000 })) {
        console.log('⚠️ Content warning modal detected, closing it...');

        // Thu thập thông tin cảnh báo từ modal
        try {
          const violationReason = await warningModal
            .locator('.reason-title')
            .textContent();
          if (violationReason) {
            console.log(`Content warning: ${violationReason}`);
          }
        } catch {
          // Nếu không lấy được thông tin chi tiết, thêm cảnh báo chung
          console.log('Content warning: Content may be restricted');
        }

        const closeButton = warningModal.locator('.common-modal-close');
        if (await closeButton.isVisible({ timeout: 2000 })) {
          await closeButton.click();
          console.log('✅ Content warning modal closed successfully');

          await page.waitForTimeout(1000);

          await page
            .locator('.footer button[data-e2e="post_video_button"]')
            .click();
          console.log('🔄 Retrying post video after closing warning modal');
        } else {
          console.log('⚠️ Could not find close button in warning modal');
        }
      } else {
        console.log('✅ No content warning modal detected');
      }
    } catch (error) {
      console.log('Error handling content warning modal:', error);
    }
  }
}
