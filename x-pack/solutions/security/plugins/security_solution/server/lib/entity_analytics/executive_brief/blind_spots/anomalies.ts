/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type { SnapshotContext } from '../snapshot/context';
import { getJobConfig, getSecurityMlJobIds } from '../../ml_anomaly_detection';
import { ML_ANOMALY_MIN_SCORE } from './constants';
import type { TacticLookup } from './mitre_tactics';

export interface AnomaliesByTactic {
  /** Security ML jobs installed in this space. */
  jobsInstalled: number;
  /** Of those, jobs in the `opened` state. */
  jobsOpened: number;
  totalAnomalies: number;
  /** Anomaly records per tactic id (a weak "possible activity" signal: job mappings are coarse). */
  byTactic: Map<string, number>;
}

interface JobBucket {
  key: string;
  doc_count: number;
}

interface AnomalyAggs {
  jobs?: { buckets: JobBucket[] };
}

/** Pure: spreads each job's anomaly count over the tactics its job config maps to. */
export const reduceAnomaliesByTactic = (
  jobBuckets: readonly JobBucket[],
  tacticsByJob: ReadonlyMap<string, readonly string[]>,
  lookup: TacticLookup
): Map<string, number> => {
  const byTactic = new Map<string, number>();
  for (const { key, doc_count: count } of jobBuckets) {
    const tacticIds = new Set(
      (tacticsByJob.get(key) ?? []).flatMap((raw) => lookup.resolveId(raw) ?? [])
    );
    for (const tacticId of tacticIds) {
      byTactic.set(tacticId, (byTactic.get(tacticId) ?? 0) + count);
    }
  }
  return byTactic;
};

/**
 * Global (not per-entity) security ML anomaly count per tactic. Returns undefined when ML is not
 * available so the caller can report a `disabled` source.
 */
export const fetchAnomaliesByTactic = async (
  ctx: SnapshotContext,
  lookup: TacticLookup,
  deps: { soClient?: SavedObjectsClientContract; mitreDataClient?: MitreAttackDataClient }
): Promise<AnomaliesByTactic | undefined> => {
  const { ml } = ctx.services;
  const { soClient, mitreDataClient } = deps;
  if (!ml || !soClient) return undefined;

  const securityJobIds = await getSecurityMlJobIds({ ml, request: ctx.request, soClient });
  const configs = await getJobConfig({
    jobIds: securityJobIds,
    logger: ctx.logger,
    ml,
    request: ctx.request,
    soClient,
    mitreDataClient,
  });
  // getJobConfig only returns jobs installed in this space.
  const installedJobIds = [...configs.keys()];
  if (installedJobIds.length === 0) {
    return { jobsInstalled: 0, jobsOpened: 0, totalAnomalies: 0, byTactic: new Map() };
  }

  const installed = new Set(installedJobIds);
  const { jobs: jobStats } = await ml.anomalyDetectorsProvider(ctx.request, soClient).jobStats();
  const jobsOpened = jobStats.filter(
    ({ job_id: jobId, state }) => installed.has(jobId) && state === 'opened'
  ).length;

  const response = await ml.mlSystemProvider(ctx.request, soClient).mlAnomalySearch<unknown>(
    {
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            { term: { result_type: 'record' } },
            { term: { is_interim: false } },
            { range: { record_score: { gte: ML_ANOMALY_MIN_SCORE } } },
            {
              range: {
                timestamp: {
                  gte: Date.parse(ctx.timeRange.from),
                  lte: Date.parse(ctx.timeRange.to),
                },
              },
            },
            { terms: { job_id: installedJobIds } },
          ],
        },
      },
      aggs: { jobs: { terms: { field: 'job_id', size: 200 } } },
    },
    installedJobIds
  );

  const { total } = response.hits;
  const aggs = response.aggregations as unknown as AnomalyAggs | undefined;
  const tacticsByJob = new Map(
    installedJobIds.map((jobId) => [jobId, configs.get(jobId)?.threatTactics ?? []])
  );
  return {
    jobsInstalled: installedJobIds.length,
    jobsOpened,
    totalAnomalies: typeof total === 'number' ? total : total?.value ?? 0,
    byTactic: reduceAnomaliesByTactic(aggs?.jobs?.buckets ?? [], tacticsByJob, lookup),
  };
};
