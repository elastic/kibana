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

const indexInfra = async (
  deps: SequentialSynthtraceWorkerDeps,
  events: SynthtraceGenerator<InfraDocument>
) => {
  const { infraEsClient } = await getSynthtraceClient(
    'infraEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  await infraEsClient.index(Readable.from(Array.from(events)));
};

const indexLogs = async (
  deps: SequentialSynthtraceWorkerDeps,
  events: SynthtraceGenerator<LogDocument>
) => {
  const { logsEsClient } = await getSynthtraceClient(
    'logsEsClient',
    {
      esClient: deps.esClient,
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  await logsEsClient.index(Readable.from(Array.from(events)));
};

const indexApm = async (
  deps: SequentialSynthtraceWorkerDeps,
  events: SynthtraceGenerator<ApmFields>
) => {
  const { apmEsClient } = await getSynthtraceClient(
    'apmEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
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
  const { infraEsClient } = await getSynthtraceClient(
    'infraEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  await infraEsClient.clean();

  const { logsEsClient } = await getSynthtraceClient(
    'logsEsClient',
    {
      esClient: deps.esClient,
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  await logsEsClient.clean();

  const { apmEsClient } = await getSynthtraceClient(
    'apmEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
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
  const { infraEsClient } = await getSynthtraceClient(
    'infraEsClient',
    {
      esClient: deps.esClient,
      kbnUrl: deps.kbnUrl.get(),
      log: deps.log,
      config: deps.config,
    },
    skipFleetForFixedDates
  );
  await infraEsClient.clean();
};
