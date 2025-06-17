import { HttpService } from '@nestjs/axios';
import { createWriteStream } from 'fs';
import { Command, CommandRunner } from 'nest-commander';
import { chromium, Page, Response } from 'playwright-core';
import { lastValueFrom } from 'rxjs';
import { Readable } from 'stream';

@Command({
  name: 'generate-image-chat-gpt',
  description: 'Generate an image using ChatGPT',
})
export class GenerateImageChatGPTCommand extends CommandRunner {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async run() {
    const browser = await chromium.launchPersistentContext(
      '/Users/gtn4/Library/Application Support/Google/Chrome/Default',
      {
        headless: false,
        executablePath:
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
          '--disable-blink-features=AutomationControlled',
          // '--profile-directory=Profile 5',
        ],
      },
    );

    try {
      console.log('Generating image using ChatGPT...');

      const page = await browser.newPage();
      await page.goto('https://chatgpt.com', {
        timeout: 10000,
      });

      const imageUrl = await this.generateImage(
        page,
        'Tạo cho tôi một bức ảnh của một con chim đại bàng',
      );

      await this.downloadImage(imageUrl, 'image.png');

      console.log('Image downloaded successfully');
    } catch (error) {
      console.log(error);
    } finally {
      await browser.close();
    }
  }

  private async generateImage(page: Page, prompt: string) {
    const promptSelector = '#prompt-textarea';

    await page.waitForSelector(promptSelector, { state: 'visible' });

    await page.click(promptSelector); // click vào để focus
    await page.fill(promptSelector, '');
    await page.keyboard.type(prompt);
    await page.keyboard.press('Enter');

    const imageUrl = await new Promise<string>((resolve, reject) => {
      const timeoutMs = 300000; // 5 phút

      const timeout = setTimeout(() => {
        page.off('response', onResponse);
        reject(
          new Error(
            '⏳ Timeout: Không tìm thấy response tải ảnh trong 5 phút.',
          ),
        );
      }, timeoutMs);

      const onResponse = async (response: Response) => {
        const url = response.url();
        if (
          url.includes('/backend-api/conversation') &&
          url.includes('/attachment/') &&
          url.includes('/download')
        ) {
          const data = (await response.json()) as {
            status: string;
            download_url: string;
            file_name: string;
          };

          if (data.status === 'success' && data.file_name.includes('.png')) {
            clearTimeout(timeout);
            page.off('response', onResponse);
            resolve(data.download_url);
          }
        }
      };

      page.on('response', onResponse);
    });

    return imageUrl;
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
}
