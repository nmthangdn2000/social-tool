import { Module } from '@nestjs/common';
import { GenerateImageChatGPTCommand } from './commands/generate-image-chat-gpt/generate-image-chat-gpt.command';
import { HttpModule } from '@nestjs/axios';
import { GenerateAudioAistudioCommand } from './commands/generate-audio-aistudio/generate-audio-aistudio.command';

@Module({
  imports: [HttpModule],
  providers: [GenerateImageChatGPTCommand, GenerateAudioAistudioCommand],
})
export class AppModule {}
