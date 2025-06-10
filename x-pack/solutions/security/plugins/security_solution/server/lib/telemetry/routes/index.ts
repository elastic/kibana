/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { Logger, IRouter, LogMeta } from '@kbn/core/server';
import type { HealthDiagnosticService } from '../diagnostic/health_diagnostic_service.types';

// TODO: just to test, remove before merging
export const registerTestHealthDiagnosticRoute = (
  router: IRouter,
  logger: Logger,
  healthDiagnostic: HealthDiagnosticService
) => {
  const log = logger.get('health-diagnostic');

  router.post(
    {
      path: '/api/update-health-diagnostic-cdn-url',
      security: {
        authz: {
          enabled: false,
          reason: 'endpoint to test the new feature, to be delete before merging',
        },
      },
      options: {
        tags: ['api'],
        access: 'public',
        summary: 'Update health diagnostic task cdn url (for testing purposes)',
      },
      validate: {
        body: schema.object({
          url: schema.string(),
          pubKey: schema.string(),
        }),
      },
    },
    async (_, request, response) => {
      const { url, pubKey } = request.body;

      log.info('Updating health diagnostic task cdn url', { url } as LogMeta);

      await healthDiagnostic.updateCdnUrl({
        url,
        pubKey,
      });

      return response.ok({
        body: {
          message: 'CDN URL updated',
          url,
        },
      });
    }
  );

  router.post(
    {
      path: '/api/trigger-health-diagnostic-task',
      security: {
        authz: {
          enabled: false,
          reason: 'endpoint to test the new feature, to be delete before merging',
        },
      },
      options: {
        tags: ['api'],
        access: 'public',
        summary: 'Trigger health diagnostic task (for testing purposes)',
      },
      validate: {
        body: schema.mapOf(schema.string(), schema.string()),
      },
    },
    async (_, request, response) => {
      const queries = new Map(
        Array.from(request.body.entries()).map(([query, lastExecution]) => {
          return [query, new Date(lastExecution).getTime()];
        })
      );

      log.info('Running diagnostic task', { queries } as LogMeta);

      const stats = await healthDiagnostic.runHealthDiagnosticQueries(Object.fromEntries(queries));

      return response.ok({
        body: {
          message: 'Task executed',
          stats,
        },
      });
    }
  );
};
