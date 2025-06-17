import { AppModule } from './app.module';
import { CommandFactory } from 'nest-commander';

async function bootstrap() {
  await CommandFactory.run(AppModule, {
    logger: ['log', 'warn', 'error'],
    serviceErrorHandler: (error) => {
      console.error(error);
      process.exit(1);
    },
  });
}

void bootstrap();
