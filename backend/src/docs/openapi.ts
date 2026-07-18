import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

/** Where the raw OpenAPI 3 document is served. */
export const OPENAPI_JSON_PATH = 'api/openapi.json';
/** Where the Scalar API reference UI is served (in place of Swagger UI). */
export const API_REFERENCE_PATH = 'docs';

/**
 * Builds the OpenAPI document and serves it through the Scalar API reference
 * UI instead of Swagger UI. The raw spec is also exposed as JSON so it can be
 * imported into external tools (Postman, Insomnia, code generators).
 */
export function setupApiDocs(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Financial AI Chat Assistant API')
    .setDescription(
      'REST + SSE API for asking natural-language questions about the ' +
        'financial statements of US public companies. Every answer is grounded ' +
        'in PostgreSQL data via SQL tool calling.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT returned by /auth/register or /auth/login.',
      },
      'bearer',
    )
    .addTag('auth', 'Registration, login, and current-user profile')
    .addTag('conversations', 'Conversation CRUD (scoped to the current user)')
    .addTag('chat', 'AI orchestration over Server-Sent Events')
    .addTag('health', 'Liveness and dependency checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Serve the raw OpenAPI document as JSON for external tooling.
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get(`/${OPENAPI_JSON_PATH}`, (_req: unknown, res: unknown) => {
    (res as { json: (body: unknown) => void }).json(document);
  });

  // Scalar API reference UI (replaces the classic Swagger UI page).
  app.use(
    `/${API_REFERENCE_PATH}`,
    apiReference({
      content: document,
      title: 'Financial AI Chat Assistant — API Reference',
    }),
  );

  return document;
}
