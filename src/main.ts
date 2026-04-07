import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function parseCorsOrigins(): string | string[] {
  const raw =
    process.env.FRONTEND_ORIGINS?.trim() ||
    process.env.FRONTEND_ORIGIN?.trim() ||
    'http://localhost:3000';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    return 'http://localhost:3000';
  }
  if (list.length === 1) {
    return list[0];
  }
  return list;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: parseCorsOrigins(), credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}
bootstrap();
