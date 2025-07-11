import { Command, CommandRunner } from 'nest-commander';
import { HttpService } from '@nestjs/axios';
import { launchBrowser } from '../../utils/browser.util';
import { readFileSync } from 'fs';
import { Page } from 'playwright-core';
import { retry } from '../../utils/common.util';

type PostReelsFacebookCommandInputs = {
  show_browser: boolean;
  is_close_browser: boolean;
  video_path: string;
  description: string;
  page?: string;
};

@Command({
  name: 'post-reels-facebook',
  description: 'Post a reels to Facebook',
})
export class PostReelsFacebookCommand extends CommandRunner {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async run(inputs: string[]) {
    const pathFileSetting = inputs[0];
    const fileSettings = JSON.parse(
      readFileSync(pathFileSetting, 'utf8'),
    ) as PostReelsFacebookCommandInputs;

    const browser = await launchBrowser(fileSettings.show_browser);

    try {
      const page = await browser.newPage();

      await page.goto('https://www.facebook.com/', {
        waitUntil: 'domcontentloaded',
      });

      const loginForm = await page.$('[data-testid="royal_login_form"]');
      if (loginForm) {
        console.log('Please login to Facebook');
        if (!fileSettings.show_browser) {
          throw new Error(
            'Please set show_browser to true to login to Facebook',
          );
        }
      }

      if (fileSettings.page) {
        await retry(async () => {
          await this.selectProfile(page, fileSettings.page!);
        });
      }

      await this.postReels(page, fileSettings);
    } catch (error) {
      console.error(error);
    } finally {
      if (fileSettings.is_close_browser) {
        await browser.close();
      }
    }
  }

  private async selectProfile(page: Page, profileName: string) {
    if (await this.checkProfileSelected(page, profileName)) {
      console.log(`✅ Profile ${profileName} already selected`);
      return;
    }

    const dialog = page.locator(
      'div[role="dialog"][aria-label="Your profile"]',
    );
    await dialog.waitFor({ state: 'visible' });

    const seeAllButton = dialog.locator(
      '[role="button"][aria-label="See all profiles"]',
    );
    if ((await seeAllButton.count()) > 0) {
      await seeAllButton.click();
    }

    await page.waitForTimeout(2000);

    const list = dialog.locator('[role="list"]');

    const targetButton = list.locator(
      `div[role="button"][tabindex="0"][aria-label^="${profileName}"]`,
    );

    if ((await targetButton.count()) === 0) {
      throw new Error(`Không tìm thấy profile ${profileName}`);
    }

    await targetButton.waitFor({ state: 'visible' });
    await targetButton.click();

    try {
      const loader = page.locator('#switching-info-container');
      await loader.waitFor({ state: 'visible' });
      await loader.waitFor({ state: 'hidden' });

      if (await this.checkProfileSelected(page, profileName)) {
        console.log(`✅ Selected profile: ${profileName}`);
        return;
      }
    } catch (error: any) {
      console.log((error as Error).message);
      console.error('Lỗi khi chờ loader chuyển profile');
      throw error;
    }

    throw new Error(`Không tìm thấy profile ${profileName}`);
  }

  private async checkProfileSelected(page: Page, profileName: string) {
    await page.waitForTimeout(1000);

    await page.waitForSelector(
      'div[aria-label="Your profile"][role="button"]',
      {
        timeout: 60000,
      },
    );

    await page.click('div[aria-label="Your profile"][role="button"]');

    const currentProfile = page.locator(
      'a[role="link"][href="/me/"]:not([aria-label])',
    );
    await currentProfile.waitFor({ state: 'visible' });

    const currentProfileText = await currentProfile.textContent();

    if (currentProfileText !== profileName) {
      return false;
    }

    return true;
  }

  private async postReels(page: Page, input: PostReelsFacebookCommandInputs) {
    try {
      await page.locator('div[role="button"]:has-text("Reel")').click();

      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (currentUrl.includes('/reels/create/')) {
        return this.postReelsOldUrl(page, input);
      }

      return this.postReelsNewUrl(page, input);
    } catch (error) {
      console.error('Đăng reels thất bại');
      throw error;
    }
  }

  private async postReelsOldUrl(
    page: Page,
    input: PostReelsFacebookCommandInputs,
  ) {
    await page.goto('https://www.facebook.com/reels/create/');

    await page.setInputFiles('input[type="file"]', input.video_path);

    await page.waitForSelector('div[aria-label="Next"][role="button"]');
    await page.click('div[aria-label="Next"]');

    await page.waitForTimeout(1000);

    const nextButtonStep2 = page
      .locator('div[aria-label="Next"][role="button"]')
      .nth(1);
    await nextButtonStep2.click();

    await page.waitForSelector('div[role="form"]');
    const editor = page.locator('div[role="form"] [contenteditable="true"]');
    await editor.click();
    await page.keyboard.type(input.description, {
      delay: 100,
    });

    await page.waitForTimeout(1000);

    const publishButton = page.locator(
      'div[aria-label="Publish"][role="button"]:not([aria-disabled="true"])',
    );
    await publishButton.waitFor({ state: 'visible' });
    await publishButton.click();

    await page.waitForTimeout(2000);

    await page.waitForSelector('[role="status"][aria-label="Loading..."]', {
      state: 'hidden',
    });

    console.log('✅ Reels đã được đăng thành công');
  }

  private async postReelsNewUrl(
    page: Page,
    input: PostReelsFacebookCommandInputs,
  ) {
    await page.setInputFiles(
      'div[aria-label="Reels"][role="form"] input[type="file"]',
      input.video_path,
    );

    await page.waitForSelector('div[aria-label="Next"][role="button"]');
    await page.click('div[aria-label="Next"]');

    await page.waitForTimeout(1000);

    const nextButtonStep2 = page
      .locator('div[aria-label="Next"][role="button"]')
      .nth(1);
    await nextButtonStep2.click();

    const form = page.locator('form[method="POST"]').nth(1);
    await form.waitFor({ state: 'visible' });
    const editor = form.locator('[contenteditable="true"]').nth(1);
    await editor.click();

    await page.keyboard.type(input.description, {
      delay: 100,
    });

    await page.waitForTimeout(1000);

    const publishButton = page.locator(
      'div[aria-label="Post"][role="button"]:not([aria-disabled="true"])',
    );
    await publishButton.waitFor({ state: 'visible' });
    await publishButton.click();

    await page.waitForTimeout(2000);

    await page.waitForSelector('[role="status"][aria-label="Loading..."]', {
      state: 'hidden',
    });

    console.log('✅ Reels đã được đăng thành công');
  }
}
