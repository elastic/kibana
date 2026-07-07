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
