import { Module } from '@nestjs/common';
import { GenerateImageChatGPTCommand } from './commands/generate-image-chat-gpt/generate-image-chat-gpt.command';
import { HttpModule } from '@nestjs/axios';
import { GenerateAudioAistudioCommand } from './commands/generate-audio-aistudio/generate-audio-aistudio.command';
import { PostTiktokCommand } from './commands/post-tiktok/post-tiktok.command';
import { PostVideoFacebookCommand } from './commands/post-video-facebook/post-video-facebook.command';

@Module({
  imports: [HttpModule],
  providers: [
    GenerateImageChatGPTCommand,
    GenerateAudioAistudioCommand,
    PostTiktokCommand,
    PostVideoFacebookCommand,
  ],
})
export class AppModule {}
