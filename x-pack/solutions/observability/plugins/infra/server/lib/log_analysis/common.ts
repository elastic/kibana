/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { CPSServerSetup } from '@kbn/cps/server';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { getProjectRoutingFromJob } from '@kbn/ml-cps-common';
import {
  OBSERVABILITY_INFRA_CPS_ENABLED_DEFAULT,
  OBSERVABILITY_INFRA_CPS_ENABLED_FEATURE_FLAG,
} from '../../../common/cps_feature_flag';
import type {
  InfraPluginStartServicesAccessor,
  MlAnomalyDetectors,
  MlSystem,
  ServerlessInfo,
} from '../../types';
import { NoLogAnalysisMlJobError } from './errors';

import type { CompositeDatasetKey, LogEntryDatasetBucket } from './queries/log_entry_data_sets';
import {
  createLogEntryDatasetsQuery,
  logEntryDatasetsResponseRT,
} from './queries/log_entry_data_sets';
import type { TracingSpan } from '../../../common/performance_tracing';
import { startTracingSpan } from '../../../common/performance_tracing';

export async function fetchMlJob(mlAnomalyDetectors: MlAnomalyDetectors, jobId: string) {
  const finalizeMlGetJobSpan = startTracingSpan('Fetch ml job from ES');
  const {
    jobs: [mlJob],
  } = await mlAnomalyDetectors.jobs(jobId);

  const mlGetJobSpan = finalizeMlGetJobSpan();

  if (mlJob == null) {
    throw new NoLogAnalysisMlJobError(`Failed to find ml job ${jobId}.`);
  }

  return {
    mlJob,
    timing: {
      spans: [mlGetJobSpan],
    },
  };
}

export interface CpsPlatformGateDeps {
  serverless: ServerlessInfo;
  cps?: CPSServerSetup;
  getStartServices: InfraPluginStartServicesAccessor;
}

/**
 * Builds the platform half of the Logs ML CPS gate — the CPS config, the infra CPS feature flag,
 * and pricing tier eligibility — mirroring the browser's `useIsCpsPlatformGateEnabled`. The ES
 * ML cross-project search capability is layered on top by `fetchIsInfraMlCpsEnabled`.
 */
export const createIsCpsPlatformGateEnabled =
  ({ serverless, cps, getStartServices }: CpsPlatformGateDeps) =>
  async (): Promise<boolean> => {
    if (!serverless.isServerless || !serverless.cpsEnabled || !cps) {
      return false;
    }

    const [coreStart] = await getStartServices();
    const isCpsFeatureFlagEnabled = await coreStart.featureFlags.getBooleanValue(
      OBSERVABILITY_INFRA_CPS_ENABLED_FEATURE_FLAG,
      OBSERVABILITY_INFRA_CPS_ENABLED_DEFAULT
    );
    if (!isCpsFeatureFlagEnabled) {
      return false;
    }

    return cps.isTierEligible();
  };

/**
 * The server twin of the browser's `useIsInfraMlCpsEnabled` gate: the platform conditions plus
 * whether Elasticsearch supports ML cross-project search, as reported by the ML info API. An unreachable or
 * erroring ML info API reads as capability-off.
 * Skips the ML call entirely when the platform gate is disabled.
 */
export const fetchIsInfraMlCpsEnabled = async (
  isCpsPlatformGateEnabled: () => Promise<boolean>,
  mlSystem: MlSystem
): Promise<boolean> => {
  if (!(await isCpsPlatformGateEnabled())) {
    return false;
  }

  try {
    const { isMlCpsEnabled } = await mlSystem.mlInfo();
    return Boolean(isMlCpsEnabled);
  } catch {
    return false;
  }
};

/**
 * Resolves the CPS project scope to query raw log data with on behalf of an ML job. Returns
 * undefined when the Logs ML CPS gate is disabled, leaving the queries at their default scope.
 */
export const resolveJobProjectRouting = (
  mlJob: estypes.MlJob,
  isMlCpsEnabled: boolean
): string | undefined => {
  if (!isMlCpsEnabled) {
    return undefined;
  }

  return getProjectRoutingFromJob(mlJob) ?? undefined;
};

export const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

// Finds datasets related to ML job ids
export async function getLogEntryDatasets(
  mlSystem: MlSystem,
  startTime: number,
  endTime: number,
  jobIds: string[]
) {
  const finalizeLogEntryDatasetsSpan = startTracingSpan('get data sets');

  let logEntryDatasetBuckets: LogEntryDatasetBucket[] = [];
  let afterLatestBatchKey: CompositeDatasetKey | undefined;
  let esSearchSpans: TracingSpan[] = [];

  while (true) {
    const finalizeEsSearchSpan = startTracingSpan('fetch log entry dataset batch from ES');

    const logEntryDatasetsResponse = decodeOrThrow(logEntryDatasetsResponseRT)(
      await mlSystem.mlAnomalySearch(
        createLogEntryDatasetsQuery(
          jobIds,
          startTime,
          endTime,
          COMPOSITE_AGGREGATION_BATCH_SIZE,
          afterLatestBatchKey
        ),
        jobIds
      )
    );

    const { after_key: afterKey, buckets: latestBatchBuckets = [] } =
      logEntryDatasetsResponse.aggregations?.dataset_buckets ?? {};

    logEntryDatasetBuckets = [...logEntryDatasetBuckets, ...latestBatchBuckets];
    afterLatestBatchKey = afterKey;
    esSearchSpans = [...esSearchSpans, finalizeEsSearchSpan()];

    if (latestBatchBuckets.length < COMPOSITE_AGGREGATION_BATCH_SIZE) {
      break;
    }
  }

  const logEntryDatasetsSpan = finalizeLogEntryDatasetsSpan();

  return {
    data: logEntryDatasetBuckets.map((logEntryDatasetBucket) => logEntryDatasetBucket.key.dataset),
    timing: {
      spans: [logEntryDatasetsSpan, ...esSearchSpans],
    },
  };
}
