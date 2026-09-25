/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sequential `tests/` UI specs do not run `parallel_tests/global.setup.ts`.
 *
 * Payloads mirror the pod windows indexed there. Ingestion uses
 * `getSynthtraceClient` with `{ skipInstallation: true }` so fixed-date docs
 * are not rejected by TSDS — same reason as `sequential_hosts_synthtrace.ts`.
 */

import type { InfraDocument, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { getSynthtraceClient } from '@kbn/scout-synthtrace';
import { Readable } from 'stream';
import {
  DATE_WITH_MIXED_POD_DATA_FROM,
  DATE_WITH_MIXED_POD_DATA_TO,
  DATE_WITH_POD_DATA_FROM,
  DATE_WITH_POD_DATA_TO,
  DATE_WITH_SEMCONV_DATA_FROM,
  DATE_WITH_SEMCONV_DATA_TO,
  DATE_WITH_SEMCONV_POD_DATA_FROM,
  DATE_WITH_SEMCONV_POD_DATA_TO,
  POD_COUNT,
  SEMCONV_HOSTS,
  SEMCONV_PODS,
} from './constants';
import type { SequentialSynthtraceWorkerDeps } from './sequential_hosts_synthtrace';
import { generatePodsData } from './synthtrace/pods_data';
import { generateSemconvHostData } from './synthtrace/semconv_host_data';
import { generateSemconvPodsData } from './synthtrace/semconv_pods_data';

const skipFleetForFixedDates = { skipInstallation: true as const };

type SynthtraceClientName = 'infraEsClient';

const unwrapSynthtraceClient = <TClient>(
  clientName: SynthtraceClientName,
  value: unknown
): TClient => {
  // Intentional `as Record` type assertion as getSynthtraceClient returns a cached client or a named wrapper opaquely;
  if (value && typeof value === 'object' && clientName in (value as Record<string, unknown>)) {
    // Intentional `as Record<SynthtraceClientName, TClient>` type assertion as the named-wrapper branch is only known after the `in` check;
    return (value as Record<SynthtraceClientName, TClient>)[clientName];
  }

  // Intentional `as TClient` type assertion as the non-wrapper return is the client itself with no typed discriminant;
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
  const infraEsClient = unwrapSynthtraceClient<{ index: (s: Readable) => Promise<void> }>(
    'infraEsClient',
    result
  );
  await infraEsClient.index(Readable.from(Array.from(events)));
};

/**
 * Indexes the Inventory SemConv pod windows used by
 * `tests/inventory/inventory_pods_semconv.spec.ts`.
 */
export const ingestInventoryPodsSemconvSynthtraceData = async (
  deps: SequentialSynthtraceWorkerDeps
): Promise<void> => {
  await indexInfra(
    deps,
    generatePodsData({
      from: DATE_WITH_POD_DATA_FROM,
      to: DATE_WITH_POD_DATA_TO,
      count: POD_COUNT,
    })
  );

  await indexInfra(
    deps,
    generateSemconvHostData({
      from: DATE_WITH_SEMCONV_DATA_FROM,
      to: DATE_WITH_SEMCONV_DATA_TO,
      hosts: SEMCONV_HOSTS,
    })
  );
  await indexInfra(
    deps,
    generateSemconvPodsData({
      from: DATE_WITH_SEMCONV_DATA_FROM,
      to: DATE_WITH_SEMCONV_DATA_TO,
      pods: SEMCONV_PODS,
    })
  );

  await indexInfra(
    deps,
    generateSemconvPodsData({
      from: DATE_WITH_SEMCONV_POD_DATA_FROM,
      to: DATE_WITH_SEMCONV_POD_DATA_TO,
      pods: SEMCONV_PODS,
    })
  );

  await indexInfra(
    deps,
    generatePodsData({
      from: DATE_WITH_MIXED_POD_DATA_FROM,
      to: DATE_WITH_MIXED_POD_DATA_TO,
      count: POD_COUNT,
    })
  );
  await indexInfra(
    deps,
    generateSemconvPodsData({
      from: DATE_WITH_MIXED_POD_DATA_FROM,
      to: DATE_WITH_MIXED_POD_DATA_TO,
      pods: SEMCONV_PODS,
    })
  );
};

export const cleanInventoryPodsSemconvSynthtraceData = async (
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
  const infraEsClient = unwrapSynthtraceClient<{ clean: () => Promise<void> }>(
    'infraEsClient',
    result
  );
  await infraEsClient.clean();
};
