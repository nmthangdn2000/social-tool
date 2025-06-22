import { HttpService } from '@nestjs/axios';
import { createWriteStream, readFileSync } from 'fs';
import { Command, CommandRunner } from 'nest-commander';
import { chromium, Page, Response } from 'playwright-core';
import { lastValueFrom } from 'rxjs';
import { Readable } from 'stream';
import { retry, sleep } from '../utils/common.util';
import { getChromeProfileSettings } from '../utils/chorme-setting.util';

interface GenerateImageChatGPTCommandInputs {
  show_browser: boolean;
  delay_between_jobs: number;
  jobs: {
    prompt: string;
    outputPath: string;
  }[];
}

@Command({
  name: 'generate-image-chat-gpt',
  description: 'Generate an image using ChatGPT',
  arguments: '<file-settings>',
})
export class GenerateImageChatGPTCommand extends CommandRunner {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async run(inputs: string[]) {
    const pathFileSetting = inputs[0];
    const fileSettings = JSON.parse(
      readFileSync(pathFileSetting, 'utf8'),
    ) as GenerateImageChatGPTCommandInputs;

    const chromeProfileSettings = getChromeProfileSettings();

    const browser = await chromium.launchPersistentContext(
      chromeProfileSettings.userDataDir,
      {
        headless: fileSettings.show_browser ? false : true,
        executablePath: chromeProfileSettings.executablePath,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          // '--profile-directory=Profile 5',
        ],
        viewport: { width: 1920, height: 1080 },
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    );

    try {
      console.log('Generating image using ChatGPT...');

      const page = await browser.newPage();
      await page.goto('https://chatgpt.com', {
        timeout: 10000,
      });

      for (const job of fileSettings.jobs) {
        try {
          const imageUrl = await this.generateImage(page, job.prompt);

          await this.downloadImage(imageUrl, job.outputPath);

          await sleep(fileSettings.delay_between_jobs);
        } catch (error) {
          throw new Error(`❌ Lỗi: ${job.prompt} - ${error}`);
        }
      }

      console.log('Image downloaded successfully');
    } catch (error) {
      console.log(error);
    } finally {
      await browser.close();
      process.exit(0);
    }
  }

  private async generateImage(page: Page, prompt: string) {
    const promptSelector = '#prompt-textarea';

    await page.waitForSelector(promptSelector, {
      state: 'visible',
    });

    await page.click(promptSelector); // click vào để focus
    await page.fill(promptSelector, '');
    await page.keyboard.type(prompt);
    await page.keyboard.press('Enter');

    // const imageUrl = await new Promise<string>((resolve, reject) => {
    //   // let downloadUrl: string;

    //   // const onResponse = async (response: Response) => {
    //   //   const url = response.url();
    //   //   if (
    //   //     url.includes('/backend-api/conversation') &&
    //   //     url.includes('/attachment/') &&
    //   //     url.includes('/download')
    //   //   ) {
    //   //     const data = (await response.json()) as {
    //   //       status: string;
    //   //       download_url: string;
    //   //       file_name: string;
    //   //     };

    //   //     if (data.status === 'success' && data.file_name.includes('.png')) {
    //   //       console.log('data', data);

    //   //       downloadUrl = data.download_url;
    //   //     }
    //   //   }
    //   // };

    //   // page.on('response', onResponse);

    //   retry(async () => {
    //     await this.waitOneOf(page);
    //   })
    //     .then(() => {
    //       const downloadUrl = this.getLastImageURLInLastResponse(page);
    //     })
    //     .catch((error: Error) => {
    //       reject(error);
    //     })
    //     .finally(() => {});
    // });

    await retry(async () => {
      await this.waitOneOf(page);
    });

    return await this.getLastImageURLInLastResponse(page);
  }

  private async downloadImage(imageUrl: string, outputPath: string) {
    const imageResponse = await lastValueFrom(
      this.httpService.get(imageUrl, {
        responseType: 'stream',
      }),
    );

    const stream = imageResponse.data as Readable;

    const writer = createWriteStream(outputPath);
    stream.pipe(writer);
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', (error) => reject(error));
    });
  }

  private async waitOneOf(page: Page) {
    await sleep(1000);

    const articles = await page.$$('article[data-testid^="conversation-turn"]');
    if (articles.length === 0) {
      throw new Error('❌ Không tìm thấy article nào.');
    }
    const lastArticle = articles[articles.length - 1];

    const selectors = [
      '[data-testid="copy-turn-action-button"]',
      '[data-testid="good-response-turn-action-button"]',
      '[data-testid="bad-response-turn-action-button"]',
    ];

    return await Promise.race(
      selectors.map((selector) =>
        lastArticle.waitForSelector(selector, {
          timeout: 1000 * 60 * 5,
        }),
      ),
    );
  }

  private async getLastImageURLInLastResponse(page: Page) {
    await sleep(1000);

    const articles = await page.$$('article[data-testid^="conversation-turn"]');
    if (articles.length === 0) {
      throw new Error('❌ Không tìm thấy article nào.');
    }
    const lastArticle = articles[articles.length - 1];
    const text = await lastArticle.textContent();

    const imageElement = await lastArticle.$('img');

    if (!imageElement) {
      throw new Error(`❌ Lỗi: ${text}`);
    }

    const imageURL = await imageElement.getAttribute('src');
    if (!imageURL) {
      throw new Error(`❌ Lỗi: ${text}`);
    }

    return imageURL;
  }
}
