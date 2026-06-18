/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import { castArray } from 'lodash';
import { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { REPO_ROOT } from '@kbn/repo-info';
import { timerange } from '@kbn/synthtrace-client';
import type { RunOptions, Scenario, SynthtraceClients } from '@kbn/synthtrace';
import { createLogger, indexAll, LogLevel, SynthtraceClientsManager } from '@kbn/synthtrace';
import type { SynthtraceConnectionOverride, SynthtraceProgressEvent } from '../../common';
import type { ObservabilityDemoDataConfig } from '../config';
import { SERVER_SCENARIO_CATALOG } from '../scenario_catalog';

interface RunScenarioParams {
  scenarioId: string;
  /** Epoch milliseconds. */
  from: number;
  /** Epoch milliseconds. */
  to: number;
  clean: boolean;
  esClient: Client;
  config: ObservabilityDemoDataConfig;
  connection?: SynthtraceConnectionOverride;
  logger: Logger;
  /** Optional callback for streaming real progress to the caller. */
  onProgress?: (event: SynthtraceProgressEvent) => void;
}

interface RunScenarioResult {
  eventsIndexed: number;
}

const createEsClientFromConnection = (connection: SynthtraceConnectionOverride): Client => {
  if (!connection.esUrl) {
    throw new Error('connection.esUrl is required when overriding the Elasticsearch target');
  }

  const url = new URL(connection.esUrl);
  const node = `${url.protocol}//${url.host}`;

  if (connection.apiKey) {
    return new Client({ node, auth: { apiKey: connection.apiKey } });
  }

  const username = connection.username || decodeURIComponent(url.username);
  const password = connection.password || decodeURIComponent(url.password);

  if (username && password) {
    return new Client({ node, auth: { username, password } });
  }

  return new Client({ node });
};

const resolveKibanaAuth = (
  config: ObservabilityDemoDataConfig,
  connection?: SynthtraceConnectionOverride
): {
  kibanaUrl: string;
  username?: string;
  password?: string;
  apiKey?: string;
} => ({
  kibanaUrl: connection?.kibanaUrl ?? config.synthtrace.kibanaUrl,
  username: connection?.username ?? config.synthtrace.username,
  password: connection?.password ?? config.synthtrace.password,
  apiKey: connection?.apiKey ?? config.synthtrace.apiKey,
});

/**
 * Runs a curated synthtrace scenario server-side (historical mode only) and
 * bulk-indexes the generated documents into Elasticsearch. Mirrors the CLI
 * pipeline but without worker threads or live streaming.
 */
export const runScenario = async ({
  scenarioId,
  from,
  to,
  clean,
  esClient: defaultEsClient,
  config,
  connection,
  logger,
  onProgress,
}: RunScenarioParams): Promise<RunScenarioResult> => {
  const definition = SERVER_SCENARIO_CATALOG[scenarioId];

  if (!definition) {
    throw new Error(`Unknown scenario "${scenarioId}"`);
  }

  const ownsEsClient = Boolean(connection?.esUrl);
  const esClient = ownsEsClient ? createEsClientFromConnection(connection!) : defaultEsClient;

  // synthtrace's `indexAll`/`client.index` return void, so the only source of
  // the indexed document count is the `Produced <n> events` line each ES client
  // logs after a successful bulk index (see kbn-synthtrace base_client.ts). We
  // intercept that line per client and accumulate it; this is the same count
  // surfaced by the synthtrace CLI. If synthtrace changes that wording, the
  // count would read 0 — covered by `run_scenario.test`-style assertions.
  let eventsIndexed = 0;
  const synthtraceLogger = createLogger(LogLevel.info);
  const originalInfo = synthtraceLogger.info.bind(synthtraceLogger);
  const producedEventsPattern = /^Produced (\d+) events$/;
  synthtraceLogger.info = (message: string) => {
    const match = producedEventsPattern.exec(String(message));
    if (match) {
      eventsIndexed += parseInt(match[1], 10);
      onProgress?.({ type: 'progress', eventsIndexed });
    }
    originalInfo(message);
  };

  const { kibanaUrl, username, password, apiKey } = resolveKibanaAuth(config, connection);

  try {
    const clientsManager = new SynthtraceClientsManager({
      client: esClient,
      logger: synthtraceLogger,
      refreshAfterIndex: true,
    });

    const clients = clientsManager.getClients({
      clients: definition.clients,
      kibana: { target: kibanaUrl, username, password, apiKey, logger: synthtraceLogger },
    });

    // Install integration packages (APM, infra) so generated docs land in the
    // expected data streams.
    onProgress?.({ type: 'phase', phase: 'installing_packages' });
    await clientsManager.initFleetPackageForClient({ clients, skipInstallation: false });

    const scenarioPath = join(REPO_ROOT, definition.relativePath);
    const scenarioModule = await import(scenarioPath);
    const scenario: Scenario | undefined = scenarioModule?.default;

    if (typeof scenario !== 'function') {
      throw new Error(`Scenario "${scenarioId}" does not export a default function`);
    }

    const runOptions = {
      files: [scenarioPath],
      logLevel: LogLevel.info,
      scenarioOpts: {},
      concurrency: 1,
      clean,
    } as unknown as RunOptions;

    onProgress?.({ type: 'phase', phase: 'generating' });
    const { generate, setupPipeline, bootstrap } = await scenario({
      ...runOptions,
      logger: synthtraceLogger,
      from,
      to,
    });

    if (clean) {
      await Promise.all(Object.values(clients).map((client) => client.clean()));
    }

    // Mirror the CLI pipeline: run the scenario's bootstrap (e.g. installing
    // custom index templates) before generating. The curated scenarios only use
    // the synthtrace clients here; bootstraps needing a Kibana client would
    // surface a clear error the caller can show.
    if (bootstrap) {
      await (bootstrap as (synthtraceClients: SynthtraceClients) => Promise<void>)(clients);
    }

    const generatorsAndClients = castArray(
      generate({ range: timerange(new Date(from), new Date(to)), clients })
    );

    if (setupPipeline) {
      setupPipeline(clients);
    }

    onProgress?.({ type: 'phase', phase: 'indexing' });
    logger.info(`Indexing synthtrace scenario "${scenarioId}"`);
    await indexAll(generatorsAndClients);

    return { eventsIndexed };
  } finally {
    if (ownsEsClient) {
      await esClient.close();
    }
  }
};
