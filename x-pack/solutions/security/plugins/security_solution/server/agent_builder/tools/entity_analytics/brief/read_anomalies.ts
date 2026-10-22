/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { isSecurityJob } from '../../../../../common/machine_learning/is_security_job';
import { getPeriodStart } from './describe_scope';
import { buildRecordFilters } from './match_candidate_records';
import type { BriefCandidate, EntityAnomalies } from './types';

/** The machine learning jobs' results, as the Entities with anomalies tile reads them. */
const ANOMALY_INDICES = '.ml-anomalies-shared*';
/** The two jobs with the highest record score are given to the model. */
const MAX_JOBS_PER_ENTITY = 1;

interface AnomaliesByCandidate {
  byCandidate?: {
    buckets: Record<
      string,
      {
        doc_count: number;
        jobCount: { value: number };
        jobs: { top: { buckets: Array<{ key: string; highestScore: { value: number } }> } };
      }
    >;
  };
}

/**
 * The anomaly records of each candidate in the captured period, how many jobs raised them, and the named
 * jobs with the highest record score, as the Entities with anomalies tile counts them: the records of the
 * installed Security jobs. An
 * anomaly record carries no entity id, so a record is matched on the identity fields of the candidate's and
 * its members' records. A user who can't read the jobs or the results has no anomalies, never a failed brief.
 */
export const readAnomalies = async ({
  candidates,
  scope,
  esClient,
  logger,
}: {
  candidates: BriefCandidate[];
  scope: EntityAnalyticsScope;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<Record<string, EntityAnomalies>> => {
  if (candidates.length === 0) {
    return {};
  }
  try {
    const { jobIds, nameByJobId } = await readSecurityJobs(esClient);
    if (jobIds.length === 0) {
      return {};
    }
    const response = await esClient.search<unknown, AnomaliesByCandidate>({
      index: ANOMALY_INDICES,
      size: 0,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { result_type: 'record' } },
            { term: { is_interim: false } },
            { terms: { job_id: jobIds } },
            { range: { record_score: { gte: 1 } } },
            {
              range: {
                '@timestamp': {
                  gte: getPeriodStart(scope).toISOString(),
                  lte: scope.capturedAt,
                },
              },
            },
          ],
        },
      },
      aggs: {
        byCandidate: {
          filters: {
            filters: Object.fromEntries(
              candidates.map((candidate) => [
                candidate.id,
                { bool: { should: buildRecordFilters(candidate), minimum_should_match: 1 } },
              ])
            ),
          },
          aggs: {
            jobCount: { cardinality: { field: 'job_id' } },
            jobs: buildJobsAggregation([...nameByJobId.keys()]),
          },
        },
      },
    });
    return toAnomaliesByCandidateId(response.aggregations, nameByJobId);
  } catch (error) {
    logger.debug(`AI brief: no anomalies: ${error.message}`);
    return {};
  }
};

/**
 * The installed jobs of the Security groups, as the page picks them, and the names of those the page names:
 * a job without a display name is counted but never cited, because its id and description don't read as a name.
 */
export const readSecurityJobs = async (
  esClient: ElasticsearchClient
): Promise<{ jobIds: string[]; nameByJobId: Map<string, string> }> => {
  const { jobs } = await esClient.ml.getJobs(
    { allow_no_match: true },
    {
      querystring: {
        filter_path: 'jobs.job_id,jobs.groups,jobs.custom_settings.security_app_display_name',
      },
    }
  );
  const securityJobs = jobs.filter(({ groups = [] }) => isSecurityJob({ groups }));
  return {
    jobIds: securityJobs.map(({ job_id: id }) => id),
    nameByJobId: new Map(
      securityJobs.flatMap(({ job_id: id, custom_settings: settings }) =>
        settings?.security_app_display_name ? [[id, settings.security_app_display_name]] : []
      )
    ),
  };
};

/** The named jobs with the highest record score first. */
export const buildJobsAggregation = (namedJobIds: string[]) => ({
  filter: { terms: { job_id: namedJobIds } },
  aggs: {
    top: {
      terms: {
        field: 'job_id',
        size: MAX_JOBS_PER_ENTITY,
        order: { highestScore: 'desc' as const },
      },
      aggs: { highestScore: { max: { field: 'record_score' } } },
    },
  },
});

/** The candidates that have anomaly records, with their jobs. */
export const toAnomaliesByCandidateId = (
  aggregations: AnomaliesByCandidate | undefined,
  nameByJobId: Map<string, string>
): Record<string, EntityAnomalies> =>
  Object.fromEntries(
    Object.entries(aggregations?.byCandidate?.buckets ?? {}).flatMap(([id, bucket]) =>
      bucket.doc_count > 0
        ? [
            [
              id,
              {
                count: bucket.doc_count,
                jobCount: bucket.jobCount.value,
                jobs: bucket.jobs.top.buckets.flatMap(({ key, highestScore }, index) => {
                  const name = nameByJobId.get(key);
                  return name
                    ? [{ index: index + 1, name, score: Math.round(highestScore.value) }]
                    : [];
                }),
              },
            ],
          ]
        : []
    )
  );
