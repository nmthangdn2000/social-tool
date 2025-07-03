import { Command, CommandRunner } from 'nest-commander';
import { HttpService } from '@nestjs/axios';
import { launchBrowser } from '../../utils/browser.util';
import { readFileSync } from 'fs';
import { Page } from 'playwright-core';

type PostVideoFacebookCommandInputs = {
  show_browser: boolean;
  is_close_browser: boolean;
  video_path: string;
  page: string;
};

@Command({
  name: 'post-video-facebook',
  description: 'Post a video to Facebook',
})
export class PostVideoFacebookCommand extends CommandRunner {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async run(inputs: string[]) {
    const pathFileSetting = inputs[0];
    const fileSettings = JSON.parse(
      readFileSync(pathFileSetting, 'utf8'),
    ) as PostVideoFacebookCommandInputs;

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

      await this.selectProfile(page, fileSettings.page);
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

    await page.waitForTimeout(1000);

    const list = dialog.locator('[role="list"]');
    const targetButton = list.locator(
      `div[role="button"][tabindex="0"][aria-label="${profileName}"]`,
    );

    if ((await targetButton.count()) === 0) {
      throw new Error(`Không tìm thấy profile ${profileName}`);
    }

    await targetButton.waitFor({ state: 'visible' });
    await targetButton.click();

    if (await this.checkProfileSelected(page, profileName)) {
      console.log(`✅ Selected profile: ${profileName}`);
      return;
    }

    throw new Error(`Không tìm thấy profile ${profileName}`);
  }

  private async checkProfileSelected(page: Page, profileName: string) {
    await page.waitForTimeout(1000);

    await page.waitForSelector('div[aria-label="Your profile"][role="button"]');

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
}
