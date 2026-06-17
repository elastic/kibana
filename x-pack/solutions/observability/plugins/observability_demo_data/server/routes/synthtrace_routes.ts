/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import type { Client } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import datemath from '@kbn/datemath';
import type { SynthtraceProgressEvent } from '../../common';
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

/**
 * In-browser runs execute inside the Kibana server process and buffer generated
 * docs in a single heap, so an unbounded range (e.g. weeks) can OOM the server.
 * It would also fall outside the TSDB writable window of metrics data streams
 * (~2h look-back), causing dropped documents. Cap the window defensively.
 */
const MAX_RUN_WINDOW_MS = 2 * 60 * 60 * 1000;

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
      const requestedFromMs = parseDate(from, () => toMs - 60 * 60 * 1000);
      const fromMs = Math.max(requestedFromMs, toMs - MAX_RUN_WINDOW_MS);

      if (fromMs !== requestedFromMs) {
        logger.warn(
          `Synthtrace run window for "${scenarioId}" was clamped to the last ${
            MAX_RUN_WINDOW_MS / (60 * 60 * 1000)
          }h to avoid excessive memory use and out-of-window documents. Use the CLI for larger ranges.`
        );
      }

      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser as unknown as Client;

      // Stream progress as NDJSON so the UI can reflect real backend phases and
      // event counts instead of a hardcoded timer. The handler returns the
      // stream immediately and keeps writing to it until the run completes.
      const stream = new PassThrough();
      // A client disconnect destroys the stream and would otherwise surface as
      // an unhandled 'error' event (crashing the process). Swallow it instead.
      stream.on('error', () => {});

      const write = (event: SynthtraceProgressEvent) => {
        if (stream.writableEnded || stream.destroyed) {
          return;
        }
        try {
          stream.write(`${JSON.stringify(event)}\n`);
        } catch {
          // Ignore writes that race a client disconnect.
        }
      };

      void (async () => {
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
            onProgress: write,
          });
          write({ type: 'complete', eventsIndexed });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to run synthtrace scenario "${scenarioId}": ${message}`);
          write({ type: 'error', message });
        } finally {
          if (!stream.writableEnded && !stream.destroyed) {
            stream.end();
          }
        }
      })();

      return response.ok({
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
        },
        body: stream,
      });
    }
  );
};
