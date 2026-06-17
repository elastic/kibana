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
import type { RunOptions, Scenario } from '@kbn/synthtrace';
import { createLogger, indexAll, LogLevel, SynthtraceClientsManager } from '@kbn/synthtrace';
import type { SynthtraceConnectionOverride } from '../../common';
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
}: RunScenarioParams): Promise<RunScenarioResult> => {
  const definition = SERVER_SCENARIO_CATALOG[scenarioId];

  if (!definition) {
    throw new Error(`Unknown scenario "${scenarioId}"`);
  }

  const ownsEsClient = Boolean(connection?.esUrl);
  const esClient = ownsEsClient ? createEsClientFromConnection(connection!) : defaultEsClient;

  let eventsIndexed = 0;
  const synthtraceLogger = createLogger(LogLevel.info);
  const originalInfo = synthtraceLogger.info.bind(synthtraceLogger);
  synthtraceLogger.info = (message: string) => {
    const match = /^Produced (\d+) events$/.exec(String(message));
    if (match) {
      eventsIndexed += parseInt(match[1], 10);
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

    const { generate, setupPipeline, bootstrap } = await scenario({
      ...runOptions,
      logger: synthtraceLogger,
      from,
      to,
    });

    if (bootstrap) {
      throw new Error(
        `Scenario "${scenarioId}" requires a bootstrap step that is not supported in the browser. Use the CLI command instead.`
      );
    }

    if (clean) {
      await Promise.all(Object.values(clients).map((client) => client.clean()));
    }

    const generatorsAndClients = castArray(
      generate({ range: timerange(new Date(from), new Date(to)), clients })
    );

    if (setupPipeline) {
      setupPipeline(clients);
    }

    logger.info(`Indexing synthtrace scenario "${scenarioId}"`);
    await indexAll(generatorsAndClients);

    return { eventsIndexed };
  } finally {
    if (ownsEsClient) {
      await esClient.close();
    }
  }
};
