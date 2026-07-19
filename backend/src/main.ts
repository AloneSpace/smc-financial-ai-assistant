import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API_REFERENCE_PATH, setupApiDocs } from './docs/openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.get<string>('app.frontendUrl'),
    credentials: true,
  });

  app.enableShutdownHooks();

  setupApiDocs(app);

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port);
  logger.log(`Backend listening on http://localhost:${port}`);
  logger.log(
    `API reference (Scalar) available on http://localhost:${port}/${API_REFERENCE_PATH}`,
  );
}

void bootstrap();
