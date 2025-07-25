import { Module } from '@nestjs/common';
import { GenerateImageChatGPTCommand } from './commands/generate-image-chat-gpt/generate-image-chat-gpt.command';
import { HttpModule } from '@nestjs/axios';
import { GenerateAudioAistudioCommand } from './commands/generate-audio-aistudio/generate-audio-aistudio.command';
import { PostTiktokCommand } from './commands/post-tiktok/post-tiktok.command';
import { PostReelsFacebookCommand } from './commands/post-reels-facebook/post-reels-facebook.command';
import { PostReelsInstagramCommand } from './commands/post-reels-instagram/post-reels-instagram.command';

@Module({
  imports: [HttpModule],
  providers: [
    GenerateImageChatGPTCommand,
    GenerateAudioAistudioCommand,
    PostTiktokCommand,
    PostReelsFacebookCommand,
    PostReelsInstagramCommand,
  ],
})
export class AppModule {}
