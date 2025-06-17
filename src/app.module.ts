import { Module } from '@nestjs/common';
import { GenerateImageChatGPTCommand } from './commands/generate-image-chat-gpt.command';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [GenerateImageChatGPTCommand],
})
export class AppModule {}
