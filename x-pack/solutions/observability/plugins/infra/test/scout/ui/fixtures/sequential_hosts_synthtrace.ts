/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sequential `tests/` UI specs do not run `parallel_tests/global.setup.ts`.
 *
 * Payloads mirror `global.setup.ts`, but ingestion must call `getSynthtraceClient`
 * with `{ skipInstallation: true }` so fixed-date docs are not rejected by TSDS —
 * unlike `globalSetupHook`, the default `synthtraceFixture` `infraSynthtraceEsClient`
 * does not skip Fleet install. Global setup never used that default path.
 */

import type { EsClient, KibanaUrl, ScoutLogger, ScoutTestConfig } from '@kbn/scout-oblt';
import { getSynthtraceClient } from '@kbn/scout-synthtrace';
import type {
  ApmFields,
  InfraDocument,
  LogDocument,
  SynthtraceGenerator,
} from '@kbn/synthtrace-client';
import { Readable } from 'stream';
import {
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  DATE_WITH_SEMCONV_DATA_FROM,
  DATE_WITH_SEMCONV_DATA_TO,
  HOST_NAME_WITH_SERVICES,
  HOSTS,
  SEMCONV_HOSTS,
  SERVICE_PER_HOST_COUNT,
} from './constants';
import { generateAddServicesToExistingHost } from './synthtrace/add_services_to_existing_hosts';
import { generateHostData } from './synthtrace/host_data';
import { generateLogsDataForHostsOrContainers } from './synthtrace/logs_data_for_hosts_or_containers';
import { generateSemconvHostData } from './synthtrace/semconv_host_data';

const skipFleetForFixedDates = { skipInstallation: true as const };

export interface SequentialSynthtraceWorkerDeps {
  esClient: EsClient;
  kbnUrl: KibanaUrl;
  log: ScoutLogger;
  config: ScoutTestConfig;
}

type SynthtraceClientName = 'infraEsClient' | 'logsEsClient' | 'apmEsClient';

const unwrapSynthtraceClient = <TClientName extends SynthtraceClientName, TClient>(
  clientName: TClientName,
  value: unknown
): TClient => {
  // `getSynthtraceClient` caches instances and returns inconsistent shapes:
  // - first call: { [clientName]: client }
  // - subsequent calls: client
  // Normalize so sequential suites can safely call index + clean.
  if (value && typeof value === 'object' && clientName in (value as Record<string, unknown>)) {
    return (value as Record<TClientName, TClient>)[clientName];
  }

  return value as TClient;
};

/**
 * Name of the shadow composable index template installed before ingesting fixed-date
 * host metrics. The template uses priority 500 (> Fleet's 200) and omits
 * `index.mode: time_series`, ensuring `metrics-system.*` data streams are created as
 * standard (non-TSDS) streams that accept historical timestamps.
 */
const NON_TSDS_SHADOW_TEMPLATE_NAME = 'synthtrace-hosts-flyout-metrics-system-non-tsds';

/**
 * Upserts a priority-500 shadow index template for `metrics-system.*` that deliberately
 * omits `index.mode: time_series`. This overrides any Fleet-installed TSDS template
 * (priority 200) so the data streams accept fixed historical dates used in these tests.
 */
export const ensureNonTsdsSystemTemplate = async (
  esClient: EsClient,
  log: ScoutLogger
): Promise<void> => {
  try {
    await esClient.indices.putIndexTemplate({
      name: NON_TSDS_SHADOW_TEMPLATE_NAME,
      index_patterns: ['metrics-system.*'],
      data_stream: {},
      priority: 500,
      template: {
        mappings: {
          dynamic: true,
          // Map all strings as keyword so `terms` aggregations on fields like
          // `host.name` work correctly — `dynamic: true` alone would auto-map
          // them as `text`, breaking the infra hosts API aggregation.
          dynamic_templates: [
            {
              strings_as_keyword: {
                match_mapping_type: 'string',
                mapping: { type: 'keyword', ignore_above: 1024 },
              },
            },
          ],
          properties: {
            '@timestamp': { type: 'date' },
          },
        },
      },
    });
    log.info(
      `Installed shadow index template "${NON_TSDS_SHADOW_TEMPLATE_NAME}" (priority 500, no TSDS) for metrics-system.*`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warning(
      `Failed to install shadow index template "${NON_TSDS_SHADOW_TEMPLATE_NAME}": ${message}`
    );
    throw error;
  }
};

/**
 * Removes the shadow index template installed by `ensureNonTsdsSystemTemplate`.
 * Ignores 404 (already removed).
 */
export const cleanNonTsdsSystemTemplate = async (
  esClient: EsClient,
  log: ScoutLogger
): Promise<void> => {
  try {
    await esClient.indices.deleteIndexTemplate({ name: NON_TSDS_SHADOW_TEMPLATE_NAME });
    log.info(`Removed shadow index template "${NON_TSDS_SHADOW_TEMPLATE_NAME}"`);
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404) {
      log.debug(
        `Shadow index template "${NON_TSDS_SHADOW_TEMPLATE_NAME}" not found — already removed`
      );
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    log.warning(
      `Failed to remove shadow index template "${NON_TSDS_SHADOW_TEMPLATE_NAME}": ${message}`
    );
    throw error;
  }
};

const indexInfra = async (
  deps: SequentialSynthtraceWorkerDeps,
  events: SynthtraceGenerator<InfraDocument>
) => {
  const result = await getSynthtraceClient(
    'infraEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  const infraEsClient = unwrapSynthtraceClient<
    'infraEsClient',
    { index: (s: Readable) => Promise<void> }
  >('infraEsClient', result);
  await infraEsClient.index(Readable.from(Array.from(events)));
};

const indexLogs = async (
  deps: SequentialSynthtraceWorkerDeps,
  events: SynthtraceGenerator<LogDocument>
) => {
  const result = await getSynthtraceClient(
    'logsEsClient',
    {
      esClient: deps.esClient,
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  const logsEsClient = unwrapSynthtraceClient<
    'logsEsClient',
    { index: (s: Readable) => Promise<void> }
  >('logsEsClient', result);
  await logsEsClient.index(Readable.from(Array.from(events)));
};

const indexApm = async (
  deps: SequentialSynthtraceWorkerDeps,
  events: SynthtraceGenerator<ApmFields>
) => {
  const result = await getSynthtraceClient(
    'apmEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  const apmEsClient = unwrapSynthtraceClient<
    'apmEsClient',
    { index: (s: Readable) => Promise<void> }
  >('apmEsClient', result);
  await apmEsClient.index(Readable.from(Array.from(events)));
};

export const ingestHostsFlyoutSynthtraceData = async (
  deps: SequentialSynthtraceWorkerDeps
): Promise<void> => {
  await indexInfra(
    deps,
    generateHostData({
      from: DATE_WITH_HOSTS_DATA_FROM,
      to: DATE_WITH_HOSTS_DATA_TO,
      hosts: HOSTS,
    })
  );

  await indexLogs(
    deps,
    generateLogsDataForHostsOrContainers({
      from: DATE_WITH_HOSTS_DATA_FROM,
      to: DATE_WITH_HOSTS_DATA_TO,
      hostNames: HOSTS.map((host) => host.hostName),
    })
  );

  await indexApm(
    deps,
    generateAddServicesToExistingHost({
      from: DATE_WITH_HOSTS_DATA_FROM,
      to: DATE_WITH_HOSTS_DATA_TO,
      hostName: HOST_NAME_WITH_SERVICES,
      servicesPerHost: SERVICE_PER_HOST_COUNT,
    })
  );
};

export const cleanHostsFlyoutSynthtraceData = async (
  deps: SequentialSynthtraceWorkerDeps
): Promise<void> => {
  const infraResult = await getSynthtraceClient(
    'infraEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  const infraEsClient = unwrapSynthtraceClient<'infraEsClient', { clean: () => Promise<void> }>(
    'infraEsClient',
    infraResult
  );
  await infraEsClient.clean();

  const logsResult = await getSynthtraceClient(
    'logsEsClient',
    {
      esClient: deps.esClient,
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  const logsEsClient = unwrapSynthtraceClient<'logsEsClient', { clean: () => Promise<void> }>(
    'logsEsClient',
    logsResult
  );
  await logsEsClient.clean();

  const apmResult = await getSynthtraceClient(
    'apmEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  const apmEsClient = unwrapSynthtraceClient<'apmEsClient', { clean: () => Promise<void> }>(
    'apmEsClient',
    apmResult
  );
  await apmEsClient.clean();
};

export const ingestSemconvHostsSynthtraceData = async (
  deps: SequentialSynthtraceWorkerDeps
): Promise<void> => {
  await indexInfra(
    deps,
    generateSemconvHostData({
      from: DATE_WITH_SEMCONV_DATA_FROM,
      to: DATE_WITH_SEMCONV_DATA_TO,
      hosts: SEMCONV_HOSTS,
    })
  );
};

export const cleanSemconvHostsSynthtraceData = async (
  deps: SequentialSynthtraceWorkerDeps
): Promise<void> => {
  const result = await getSynthtraceClient(
    'infraEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  const infraEsClient = unwrapSynthtraceClient<'infraEsClient', { clean: () => Promise<void> }>(
    'infraEsClient',
    result
  );
  await infraEsClient.clean();
};
