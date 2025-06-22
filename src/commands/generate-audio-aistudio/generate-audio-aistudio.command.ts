import { HttpService } from '@nestjs/axios';
import { readFileSync, writeFileSync } from 'fs';
import { Command, CommandRunner } from 'nest-commander';
import { sleep } from '../../utils/common.util';
import { launchBrowser } from '../../utils/browser.util';
import { listVoice } from './list-voice';
import { Page } from 'playwright-core';

type GenerateAudioAistudioCommandInputs = {
  show_browser: boolean;
  delay_between_jobs: number;
  jobs: {
    style_instruction: string;
    voice: string;
    prompt: string;
    outputPath: string;
  }[];
};

@Command({
  name: 'generate-audio-aistudio',
  description: 'Generate an audio using AI Studio',
  arguments: '<file-settings>',
})
export class GenerateAudioAistudioCommand extends CommandRunner {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async run(inputs: string[]) {
    const pathFileSetting = inputs[0];
    const fileSettings = JSON.parse(
      readFileSync(pathFileSetting, 'utf8'),
    ) as GenerateAudioAistudioCommandInputs;

    const browser = await launchBrowser(fileSettings.show_browser);

    try {
      const page = await browser.newPage();
      await page.goto('https://aistudio.google.com/generate-speech');

      await page.waitForSelector(
        'button.toggle-button:has-text("Single-speaker audio")',
      );
      await page.click('button.toggle-button:has-text("Single-speaker audio")');

      await sleep(1000);

      for (const job of fileSettings.jobs) {
        await this.selectVoice(page, job.voice);

        await this.generateAudio(page, job);

        await sleep(fileSettings.delay_between_jobs);
      }
    } catch (error) {
      console.log(`❌ Lỗi: ${error}`);
    } finally {
      await browser.close();
      process.exit(0);
    }
  }

  private async selectVoice(page: Page, voice: string) {
    await page.waitForSelector('ms-voice-selector .mat-mdc-text-field-wrapper');
    await page.click('ms-voice-selector .mat-mdc-text-field-wrapper');

    const voiceIndex = listVoice.indexOf(voice);

    await page.click(
      `.cdk-overlay-container #mat-select-4-panel mat-option:nth-child(${voiceIndex + 1})`,
    );

    await sleep(500);
  }

  private async generateAudio(
    page: Page,
    job: GenerateAudioAistudioCommandInputs['jobs'][number],
  ) {
    await page.fill(
      '.single-speaker-prompt-builder-wrapper > .style-instructions-textarea > textarea',
      job.style_instruction,
    );

    await page.fill(
      '.single-speaker-prompt-builder-wrapper >  textarea',
      job.prompt,
    );

    await page.waitForSelector('run-button:not([disabled])');
    await page.click('run-button');

    await sleep(1000);

    await page.waitForSelector('run-button:not(:has-text("Stop"))', {
      timeout: 1000 * 60 * 2,
    });

    const audioElement = await page.$('audio');
    let audioSrc = await audioElement?.evaluate((el) => el.src);

    if (audioSrc) {
      if (audioSrc.startsWith('data:')) {
        audioSrc = audioSrc.split(',')[1];
      }
      audioSrc = audioSrc.replace(/\s/g, '');
      const audioBuffer = Buffer.from(audioSrc, 'base64');
      writeFileSync(job.outputPath, audioBuffer);
    }
  }
}
