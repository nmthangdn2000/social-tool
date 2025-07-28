import { HttpService } from '@nestjs/axios';
import { readFileSync } from 'fs';
import { Command, CommandRunner } from 'nest-commander';
import { launchBrowser } from '../../utils/browser.util';

type PostThreadCommandInputs = {
  show_browser: boolean;
  is_close_browser: boolean;
  media_files: string[];
  description: string;
  reply_threads: {
    media_files: string;
    description: string;
  }[];
};

@Command({
  name: 'post-thread',
  description: 'Post a thread',
  arguments: '<file-settings>',
})
export class PostThreadCommand extends CommandRunner {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async run(inputs: string[]) {
    const pathFileSetting = inputs[0];
    const fileSettings = JSON.parse(
      readFileSync(pathFileSetting, 'utf8'),
    ) as PostThreadCommandInputs;

    const browser = await launchBrowser(fileSettings.show_browser);

    try {
      const page = await browser.newPage();

      await page.goto('https://www.threads.com/login', {
        waitUntil: 'domcontentloaded',
      });

      const pageUrl = page.url();
      if (pageUrl.includes('login')) {
        throw new Error('Please login to your account');
      }

      const buttonPost = page.locator('div[role="button"]:has-text("Post")');
      await buttonPost.click();

      const dialog = page.locator('div[role="dialog"]');
      await dialog.waitFor({ state: 'visible' });

      if (fileSettings.description) {
        const inputDescription = page.locator('div[contenteditable="true"]');
        await inputDescription.click();
        await inputDescription.type(fileSettings.description);
      }

      if (fileSettings.media_files.length > 0) {
        for (const mediaPath of fileSettings.media_files) {
          const fileInput = dialog.locator('input[type="file"]');
          await fileInput.setInputFiles(mediaPath);
        }
      }

      if (fileSettings.reply_threads.length > 0) {
        for (let i = 0; i < fileSettings.reply_threads.length; i++) {
          const replyThread = fileSettings.reply_threads[i];
          await dialog
            .locator('div[role="button"]:has-text("Add to thread")')
            .click();

          await page.waitForTimeout(300);

          const fileInput = dialog.locator('input[type="file"]').nth(i + 1);
          await fileInput.setInputFiles(replyThread.media_files);

          const inputDescription = page
            .locator('div[contenteditable="true"]')
            .nth(i + 1);
          await inputDescription.click();
          await inputDescription.type(replyThread.description);
        }
      }

      await page.waitForTimeout(1000);
      await dialog.locator('div[role="button"]:has-text("Post")').click();

      const postingText = page.locator('div[role="alert"] >> text=Posting...');
      await postingText.waitFor({ state: 'visible', timeout: 10000 });
      await postingText.waitFor({ state: 'detached', timeout: 1000 * 60 * 5 });

      const failedPosting = page.locator('div >> text=Post failed to upload');
      if (await failedPosting.isVisible()) {
        throw new Error('Post failed to upload');
      }

      const profileButton = page
        .locator('a[role="link"]:has-text("Profile")')
        .first();
      const hrefProfile = await profileButton.getAttribute('href');

      if (hrefProfile) {
        await page.goto(`https://www.threads.com${hrefProfile}`);
        await page.waitForLoadState('domcontentloaded');

        const listPosts = page.locator(`a[href^="${hrefProfile}/post"]`);
        const urlPost = await listPosts.first().getAttribute('href');

        console.log(
          'Post thread successfully:',
          `https://www.threads.com${urlPost}`,
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (fileSettings.is_close_browser) {
        await browser.close();
      }
    }
  }
}
