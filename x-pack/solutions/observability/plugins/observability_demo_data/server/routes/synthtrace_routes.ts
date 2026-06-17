/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import datemath from '@kbn/datemath';
import { SYNTHTRACE_RUN_API_PATH, SYNTHTRACE_STATUS_API_PATH } from '../../common';
import type { ObservabilityDemoDataConfig } from '../config';
import { runScenario } from '../lib/run_scenario';
import { isKnownScenario } from '../scenario_catalog';

const DEV_ONLY_SECURITY = {
  authz: {
    enabled: false as const,
    reason: 'Dev-only synthtrace ingestion route, gated by the devOnly plugin lifecycle.',
  },
};

const connectionSchema = schema.object({
  esUrl: schema.maybe(schema.string()),
  kibanaUrl: schema.maybe(schema.string()),
  username: schema.maybe(schema.string()),
  password: schema.maybe(schema.string()),
  apiKey: schema.maybe(schema.string()),
});

const parseDate = (value: string, fallback: () => number): number => {
  const parsed = datemath.parse(value)?.valueOf();
  return parsed ?? fallback();
};

export const registerSynthtraceRoutes = ({
  router,
  config,
  logger,
}: {
  router: IRouter;
  config: ObservabilityDemoDataConfig;
  logger: Logger;
}): void => {
  router.get(
    {
      path: SYNTHTRACE_STATUS_API_PATH,
      validate: false,
      security: DEV_ONLY_SECURITY,
    },
    async (_context, _request, response) => response.ok({ body: { available: true } })
  );

  router.post(
    {
      path: SYNTHTRACE_RUN_API_PATH,
      validate: {
        body: schema.object({
          scenarioId: schema.string(),
          from: schema.string({ defaultValue: 'now-1w' }),
          to: schema.string({ defaultValue: 'now' }),
          clean: schema.boolean({ defaultValue: false }),
          connection: schema.maybe(connectionSchema),
        }),
      },
      security: DEV_ONLY_SECURITY,
    },
    async (context, request, response) => {
      const { scenarioId, from, to, clean, connection } = request.body;

      if (!isKnownScenario(scenarioId)) {
        return response.badRequest({ body: `Unknown scenario "${scenarioId}"` });
      }

      const toMs = parseDate(to, () => Date.now());
      const fromMs = parseDate(from, () => toMs - 60 * 60 * 1000);

      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser as unknown as Client;

      try {
        const { eventsIndexed } = await runScenario({
          scenarioId,
          from: fromMs,
          to: toMs,
          clean,
          esClient,
          config,
          connection,
          logger,
        });

        return response.ok({ body: { scenarioId, eventsIndexed } });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to run synthtrace scenario "${scenarioId}": ${message}`);
        return response.customError({
          statusCode: 500,
          body: { message },
        });
      }
    }
  );
};
