/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SIEM_WORKFLOW_MIGRATIONS_TRANSLATE_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import simpleStory from '../../../../../common/siem_migrations/parsers/tines/mock/simple_story.json';
import {
  requestContextMock,
  requestMock,
  serverMock,
} from '../../../detection_engine/routes/__mocks__';
import { registerSiemWorkflowMigrationsTranslateRoute } from './translate';

describe('POST /internal/siem_migrations/workflows/translate', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.createTools>['context'];

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    registerSiemWorkflowMigrationsTranslateRoute(server.router, loggerMock.create());
  });

  it('accepts uploaded Tines story JSON and returns validated workflow YAML', async () => {
    const request = requestMock.create({
      method: 'post',
      path: SIEM_WORKFLOW_MIGRATIONS_TRANSLATE_PATH,
      body: { story: simpleStory },
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body.yaml).toContain('name: Simple story');
    expect(response.body.validation.valid).toBe(true);
    expect(response.body.report.mapped.length).toBeGreaterThan(0);
    expect(response.body.report.warnings.length).toBeGreaterThan(0);
    expect(response.body.report.requiredConnectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionTypeId: '.email',
          stepNames: expect.arrayContaining(['notify_by_email']),
        }),
      ])
    );
  });

  it('rejects a request body without a story', () => {
    const request = requestMock.create({
      method: 'post',
      path: SIEM_WORKFLOW_MIGRATIONS_TRANSLATE_PATH,
      body: {},
    });

    const result = server.validate(request);

    expect(result.badRequest).toHaveBeenCalled();
  });
});
