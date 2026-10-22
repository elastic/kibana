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
        jobs: { buckets: Array<{ key: string; highestScore: { value: number } }> };
      }
    >;
  };
}

/**
 * The anomaly records of each candidate in the captured period, and the jobs with the highest record
 * score, as the Entities with anomalies tile counts them: the records of the installed Security jobs. An
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
    const nameByJobId = await readSecurityJobNames(esClient);
    if (nameByJobId.size === 0) {
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
            { terms: { job_id: [...nameByJobId.keys()] } },
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
          aggs: { jobs: buildJobsAggregation() },
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
 * The installed jobs of the Security groups, as the page picks them, by what the reader sees: the
 * description without its full stop, or the id without one.
 */
export const readSecurityJobNames = async (
  esClient: ElasticsearchClient
): Promise<Map<string, string>> => {
  const { jobs } = await esClient.ml.getJobs(
    { allow_no_match: true },
    {
      querystring: {
        filter_path:
          'jobs.job_id,jobs.description,jobs.groups,jobs.custom_settings.security_app_display_name',
      },
    }
  );
  return new Map(
    jobs
      .filter(({ groups = [] }) => isSecurityJob({ groups }))
      // A description is a sentence, and the name sits inside one.
      .map(({ job_id: id, description, custom_settings: settings }) => [
        id,
        settings?.security_app_display_name || description?.replace(/\.$/, '') || id,
      ])
  );
};

/** The jobs with the highest record score first. */
export const buildJobsAggregation = () => ({
  terms: {
    field: 'job_id',
    size: MAX_JOBS_PER_ENTITY,
    order: { highestScore: 'desc' as const },
  },
  aggs: { highestScore: { max: { field: 'record_score' } } },
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
                jobs: bucket.jobs.buckets.map(({ key, highestScore }, index) => ({
                  index: index + 1,
                  name: nameByJobId.get(key) ?? key,
                  score: Math.round(highestScore.value),
                })),
              },
            ],
          ]
        : []
    )
  );
