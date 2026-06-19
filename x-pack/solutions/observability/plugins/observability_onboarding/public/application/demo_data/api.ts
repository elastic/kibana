/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  ALERTING_RULE_API_PATH,
  APM_ANOMALY_DETECTION_ENVIRONMENTS_API_PATH,
  APM_ANOMALY_DETECTION_JOBS_API_PATH,
  DEMO_ML_JOB_PREFIX,
  LOGS_INDEX_PATTERN,
  METRICS_INDEX_PATTERN,
  ML_FORCE_START_DATAFEEDS_API_PATH,
  ML_JOBS_API_VERSION,
  ML_JOBS_SUMMARY_API_PATH,
  ML_MODULE_API_VERSION,
  ML_MODULE_SETUP_API_PATH,
  SLO_API_PATH,
  SLO_API_VERSION,
} from './constants';
import type { CreateRuleBody, CreateSloBody } from './recommended_config';

export const createRule = (http: HttpStart, body: CreateRuleBody): Promise<unknown> =>
  http.post(ALERTING_RULE_API_PATH, { body: JSON.stringify(body) });

export const createSlo = (http: HttpStart, body: CreateSloBody): Promise<unknown> =>
  http.post(SLO_API_PATH, { version: SLO_API_VERSION, body: JSON.stringify(body) });

export const getApmEnvironments = (http: HttpStart): Promise<{ environments: string[] }> =>
  http.get(APM_ANOMALY_DETECTION_ENVIRONMENTS_API_PATH);

export const createApmAnomalyJobs = (
  http: HttpStart,
  environments: string[]
): Promise<{ jobCreated: boolean }> =>
  http.post(APM_ANOMALY_DETECTION_JOBS_API_PATH, { body: JSON.stringify({ environments }) });

/**
 * Backfill window for APM anomaly datafeeds. The APM jobs endpoint creates jobs
 * with their datafeeds stopped, so they never analyze the recently-ingested
 * (historical) demo data and appear closed/stopped. We start them over this
 * window so they process the demo data and then continue in real time.
 */
const APM_ML_BACKFILL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface MlJobSummary {
  id: string;
  datafeedId?: string;
  groups?: string[];
}

const getApmDatafeedIds = async (http: HttpStart): Promise<string[]> => {
  const jobs = await http.post<MlJobSummary[]>(ML_JOBS_SUMMARY_API_PATH, {
    version: ML_JOBS_API_VERSION,
    body: JSON.stringify({ jobIds: [] }),
  });
  return jobs.reduce<string[]>((ids, job) => {
    if (job.datafeedId && job.groups?.includes('apm')) {
      ids.push(job.datafeedId);
    }
    return ids;
  }, []);
};

/**
 * Creates the APM anomaly-detection jobs and then starts their datafeeds over a
 * backfill window so they analyze the demo data instead of sitting idle.
 */
export const setupApmAnomalyJobs = async (
  http: HttpStart,
  environments: string[]
): Promise<{ jobCreated: boolean }> => {
  const result = await createApmAnomalyJobs(http, environments);
  const datafeedIds = await getApmDatafeedIds(http);
  if (datafeedIds.length > 0) {
    await http.post(ML_FORCE_START_DATAFEEDS_API_PATH, {
      version: ML_JOBS_API_VERSION,
      body: JSON.stringify({ datafeedIds, start: Date.now() - APM_ML_BACKFILL_WINDOW_MS }),
    });
  }
  return result;
};

export interface SetupMlModuleBody {
  indexPatternName: string;
  prefix?: string;
  startDatafeed?: boolean;
  jobOverrides?: readonly unknown[];
  datafeedOverrides?: readonly unknown[];
  useDedicatedIndex?: boolean;
  start?: number;
  end?: number;
  query?: object;
}

export const setupMlModule = (
  http: HttpStart,
  moduleId: string,
  body: SetupMlModuleBody
): Promise<unknown> =>
  http.post(`${ML_MODULE_SETUP_API_PATH}/${moduleId}`, {
    version: ML_MODULE_API_VERSION,
    body: JSON.stringify({
      prefix: DEMO_ML_JOB_PREFIX,
      startDatafeed: true,
      jobOverrides: [],
      datafeedOverrides: [],
      useDedicatedIndex: false,
      ...body,
    }),
  });

/** Convenience helpers for demo ML module setup with default index patterns. */
export const setupLogsAnalysisModule = (http: HttpStart): Promise<unknown> =>
  setupMlModule(http, 'logs_ui_analysis', { indexPatternName: LOGS_INDEX_PATTERN });

export const setupLogsCategoriesModule = (http: HttpStart): Promise<unknown> =>
  setupMlModule(http, 'logs_ui_categories', { indexPatternName: LOGS_INDEX_PATTERN });

/**
 * The `metrics_ui_hosts` module's network jobs query `system.network.in/out.bytes`
 * (Metricbeat system module schema). Hosts data ingested via Elastic Agent / OTel
 * exposes network throughput as the ECS fields `host.network.ingress/egress.bytes`,
 * so without these overrides the network datafeeds match zero documents. We redirect
 * their query + aggregation to those ECS fields. The memory job already matches.
 */
const buildNetworkDatafeedOverride = (
  jobId: 'hosts_network_in' | 'hosts_network_out',
  field: string,
  maxAggName: string,
  derivativeAggName: string,
  derivativeParam: string
) => ({
  job_id: jobId,
  query: { bool: { must: [{ exists: { field } }] } },
  aggregations: {
    'host.name': {
      terms: { field: 'host.name', size: 100 },
      aggregations: {
        buckets: {
          date_histogram: { field: '@timestamp', fixed_interval: '5m' },
          aggregations: {
            '@timestamp': { max: { field: '@timestamp' } },
            [maxAggName]: { max: { field } },
            [derivativeAggName]: { derivative: { buckets_path: maxAggName } },
            positive_only: {
              bucket_script: {
                buckets_path: { [derivativeParam]: `${derivativeAggName}.value` },
                script: `params.${derivativeParam} > 0.0 ? params.${derivativeParam} : 0.0`,
              },
            },
          },
        },
      },
    },
  },
});

const METRICS_HOSTS_DATAFEED_OVERRIDES = [
  buildNetworkDatafeedOverride(
    'hosts_network_in',
    'host.network.ingress.bytes',
    'bytes_in_max',
    'bytes_in_derivative',
    'in_derivative'
  ),
  buildNetworkDatafeedOverride(
    'hosts_network_out',
    'host.network.egress.bytes',
    'bytes_out_max',
    'bytes_out_derivative',
    'out_derivative'
  ),
];

/** Default infra metrics source id; part of the job-id prefix the Hosts UI expects. */
const INFRA_METRICS_SOURCE_ID = 'default';

/**
 * Resolves the active Kibana space id so created job ids match what the
 * Infrastructure UI looks for. Falls back to the default space on any error.
 */
const getActiveSpaceId = async (http: HttpStart): Promise<string> => {
  try {
    const space = await http.get<{ id?: string }>('/internal/spaces/_active_space');
    return space?.id ?? 'default';
  } catch {
    return 'default';
  }
};

/**
 * Sets up the host metrics anomaly-detection jobs. We deliberately reuse the
 * Infrastructure UI's job-id prefix (`kibana-metrics-ui-<space>-<source>-`) so
 * the jobs are recognized on the Hosts page and surface there under "Anomaly
 * detection", instead of being orphaned under a custom prefix.
 */
export const setupMetricsHostsModule = async (http: HttpStart): Promise<unknown> => {
  const spaceId = await getActiveSpaceId(http);
  return setupMlModule(http, 'metrics_ui_hosts', {
    indexPatternName: METRICS_INDEX_PATTERN,
    prefix: `kibana-metrics-ui-${spaceId}-${INFRA_METRICS_SOURCE_ID}-`,
    datafeedOverrides: METRICS_HOSTS_DATAFEED_OVERRIDES,
  });
};
