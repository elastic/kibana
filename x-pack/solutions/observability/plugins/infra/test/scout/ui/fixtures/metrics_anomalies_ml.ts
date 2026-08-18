/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import type { estypes } from '@elastic/elasticsearch';
import type { EsClient, ObltApiServicesFixture, ScoutLogger } from '@kbn/scout-oblt';
import { METRICS_ANOMALIES_ARCHIVE, ML_ANOMALIES_INDEX, ML_JOB_IDS } from './constants';

type MlApiService = ObltApiServicesFixture['ml'];

interface EsArchiverDoc {
  type: string;
  value: { id: string; index: string; source: Record<string, unknown> };
}

// Server-assigned job fields that the ML "create job" API rejects on input.
const READ_ONLY_JOB_FIELDS = [
  'create_time',
  'finished_time',
  'job_type',
  'job_version',
  'model_snapshot_id',
  'model_snapshot_min_version',
  'establish_model_memory_timestamp',
  'state',
  'blocked',
] as const;

const ANOMALY_DETECTOR_ID_PREFIX = 'anomaly_detector-';
// Broad results pattern the ML "create job" API scans for pre-existing results/state.
const ML_ANOMALIES_INDEX_PATTERN = '.ml-anomalies-*';
const PRODUCT_ORIGIN_HEADERS = { headers: { 'x-elastic-product-origin': 'kibana' } } as const;

// es_archiver serializes each document as a pretty-printed JSON object separated by a blank line.
// Scout runs with the repo root as its working directory, so the archive path resolves from there.
const readArchiveDocs = (): EsArchiverDoc[] => {
  const dataPath = path.join(process.cwd(), METRICS_ANOMALIES_ARCHIVE, 'data.json.gz');
  const contents = zlib.gunzipSync(fs.readFileSync(dataPath)).toString('utf8');

  return contents
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => JSON.parse(chunk) as EsArchiverDoc)
    .filter((doc) => doc.type === 'doc');
};

const assertExpectedJobConfigs = (jobConfigs: Array<Partial<estypes.MlJob>>) => {
  const actualJobIds = jobConfigs.map(({ job_id: jobId }) => jobId ?? '<missing job_id>');
  const actualJobIdSet = new Set(actualJobIds);
  const expectedJobIdSet = new Set<string>(ML_JOB_IDS);
  const missingJobIds = ML_JOB_IDS.filter((jobId) => !actualJobIdSet.has(jobId));
  const unexpectedJobIds = actualJobIds.filter((jobId) => !expectedJobIdSet.has(jobId));

  if (
    actualJobIds.length !== ML_JOB_IDS.length ||
    missingJobIds.length > 0 ||
    unexpectedJobIds.length > 0
  ) {
    throw new Error(
      `Metrics anomalies archive contains unexpected ML job configurations. Expected: ${ML_JOB_IDS.join(
        ', '
      )}; actual: ${actualJobIds.join(', ') || 'none'}`
    );
  }
};

// Removes the jobs (and, via the ML API, most of their results and their `ml-job` saved objects)
// and purges any residual result documents. Deleting a job does not always remove every bulk-
// indexed result doc, and orphaned results make the ML "create job" API reject the job id with a
// 409, so this runs before (re)creating jobs and during teardown to guarantee a clean slate.
const purgeMetricsAnomaliesMlData = async ({
  mlApi,
  esClient,
}: {
  mlApi: MlApiService;
  esClient: EsClient;
}) => {
  await mlApi.anomalyDetection
    .delete({ jobIds: [...ML_JOB_IDS], deleteUserAnnotations: true })
    .catch(() => undefined);

  await esClient.deleteByQuery(
    {
      index: ML_ANOMALIES_INDEX_PATTERN,
      query: { terms: { job_id: [...ML_JOB_IDS] } },
      refresh: true,
      ignore_unavailable: true,
      conflicts: 'proceed',
    },
    PRODUCT_ORIGIN_HEADERS
  );
};

/**
 * Recreates the metrics-anomalies ML fixture from its es_archive without loading the archive's
 * restricted `.ml-config` system index — ES forbids creating that index directly, even for a
 * superuser.
 *
 * The six archived anomaly-detection jobs are instead created through the Kibana ML API, which
 * provisions `.ml-config`, the `.ml-anomalies-shared` results index with its per-job aliases, and
 * the space-scoped `ml-job` saved objects the infra ML module relies on. The archived anomaly
 * results are then bulk-indexed into `.ml-anomalies-shared` so the flyout surfaces the exact same
 * pre-computed anomalies the FTR suite asserted on.
 */
export const loadMetricsAnomaliesMlData = async ({
  mlApi,
  esClient,
  log,
}: {
  mlApi: MlApiService;
  esClient: EsClient;
  log: ScoutLogger;
}) => {
  const docs = readArchiveDocs();

  const jobConfigs = docs
    .filter(
      (doc) =>
        doc.value.index === '.ml-config' && doc.value.id.startsWith(ANOMALY_DETECTOR_ID_PREFIX)
    )
    .map((doc) => {
      const source = { ...doc.value.source };
      for (const field of READ_ONLY_JOB_FIELDS) {
        delete source[field];
      }
      return source as Partial<estypes.MlJob>;
    });

  assertExpectedJobConfigs(jobConfigs);

  // Start from a clean slate so a previous (possibly crashed) run can't block job creation.
  await purgeMetricsAnomaliesMlData({ mlApi, esClient });

  for (const jobConfig of jobConfigs) {
    await mlApi.anomalyDetection.createViaKibana(jobConfig);
  }
  log.info(`Created ${jobConfigs.length} metrics anomalies ML jobs`);

  const resultDocs = docs.filter((doc) => doc.value.index === ML_ANOMALIES_INDEX);
  const operations = resultDocs.flatMap((doc) => [
    { index: { _index: ML_ANOMALIES_INDEX, _id: doc.value.id } },
    doc.value.source,
  ]);

  const response = await esClient.bulk({ refresh: true, operations }, PRODUCT_ORIGIN_HEADERS);
  if (response.errors) {
    const firstError = response.items.find((item) => item.index?.error)?.index?.error;
    throw new Error(`Failed to index metrics anomalies results: ${JSON.stringify(firstError)}`);
  }
  log.info(`Indexed ${resultDocs.length} metrics anomalies result documents`);
};

/**
 * Removes everything {@link loadMetricsAnomaliesMlData} created: the jobs, their `ml-job` saved
 * objects, and any residual anomaly results in `.ml-anomalies-shared`.
 */
export const deleteMetricsAnomaliesMlData = async ({
  mlApi,
  esClient,
  log,
}: {
  mlApi: MlApiService;
  esClient: EsClient;
  log: ScoutLogger;
}) => {
  await purgeMetricsAnomaliesMlData({ mlApi, esClient });
  log.info('Deleted metrics anomalies ML jobs and results');
};
