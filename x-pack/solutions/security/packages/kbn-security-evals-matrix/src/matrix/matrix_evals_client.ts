/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvalsClient } from '@kbn/evals';
import {
  API_VERSIONS,
  EVALS_EXAMPLE_SCORES_URL,
  EVALS_EXPERIMENTS_URL,
  GetEvaluationExperimentsResponse,
  GetExampleScoresResponse,
  MAX_SCORES_PER_QUERY,
  type EvaluationExperimentSummary,
  type EvaluationScoreDocument,
} from '@kbn/evals-common';
import { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';

export const DEFAULT_EVALUATIONS_KBN_URL = 'http://elastic:changeme@localhost:5601';

/** The experiments route's `per_page` maximum. */
export const MAX_LIST_EXPERIMENTS = 100;

const VERSIONED_HEADERS = { 'elastic-api-version': API_VERSIONS.internal.v1 };

export interface ListExperimentsFilters {
  suiteId?: string;
  taskModelId?: string;
  branch?: string;
  /** Newest-first cap, clamped to {@link MAX_LIST_EXPERIMENTS}. */
  limit?: number;
}

export interface ExampleScoresFilters {
  executionId?: string;
  modelId?: string;
}

/** `EvalsClient` plus the experiment listing and per-example score reads the matrix needs. */
export class MatrixEvalsClient extends EvalsClient {
  constructor(private readonly matrixKbnClient: KbnClient, private readonly matrixLog: ToolingLog) {
    super(matrixKbnClient, matrixLog);
  }

  async listExperiments(
    filters: ListExperimentsFilters = {}
  ): Promise<EvaluationExperimentSummary[]> {
    const { suiteId, taskModelId, branch, limit = MAX_LIST_EXPERIMENTS } = filters;
    // Page until `limit` experiments are collected or the listing is exhausted. The route caps
    // `per_page` at MAX_LIST_EXPERIMENTS, so a fixed `page: 1` silently truncated discovery once
    // more than one page of runs existed for a suite/model — `--as-of` could then no longer
    // reproduce a historical matrix.
    const perPage = MAX_LIST_EXPERIMENTS;
    const all: EvaluationExperimentSummary[] = [];
    let page = 1;
    while (all.length < limit) {
      const { data } = await this.matrixKbnClient.request({
        path: EVALS_EXPERIMENTS_URL,
        method: 'GET',
        headers: VERSIONED_HEADERS,
        query: {
          suite_id: suiteId,
          model_id: taskModelId,
          branch,
          page,
          per_page: perPage,
        },
      });
      const { experiments, total = 0 } = GetEvaluationExperimentsResponse.parse(data);
      if (branch) {
        all.push(...experiments.filter(({ git_branch: gitBranch }) => gitBranch === branch));
      } else {
        all.push(...experiments);
      }
      if (experiments.length < perPage || all.length >= total) {
        break;
      }
      page += 1;
    }
    return all.slice(0, limit);
  }

  /**
   * Scores for one example across experiments, with unbounded fields intact.
   * Servers that ignore the filters return every execution; callers filter.
   */
  async getExampleScores(
    exampleId: string,
    { executionId, modelId }: ExampleScoresFilters = {}
  ): Promise<EvaluationScoreDocument[]> {
    try {
      const { data } = await this.matrixKbnClient.request({
        path: EVALS_EXAMPLE_SCORES_URL.replace('{exampleId}', encodeURIComponent(exampleId)),
        method: 'GET',
        headers: VERSIONED_HEADERS,
        query: {
          ...(executionId ? { execution_id: executionId } : {}),
          ...(modelId ? { model_id: modelId } : {}),
        },
      });
      const { total, scores } = GetExampleScoresResponse.parse(data);
      if (total > MAX_SCORES_PER_QUERY) {
        throw new Error(
          `Example ${exampleId} returned ${total} scores, which exceeds MAX_SCORES_PER_QUERY (${MAX_SCORES_PER_QUERY})`
        );
      }
      return scores;
    } catch (error) {
      this.matrixLog.error(
        `Failed to retrieve scores for example ID ${exampleId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Rethrow so queryMatrixTraces' bounded retry can absorb transient 502/503s;
      // swallowing here would record a permanently missing trace instead.
      throw error;
    }
  }
}

/** Kibana client for the evaluations target, authenticated with an API key when given. */
export const createEvaluationsKbnClient = ({
  log,
  url = DEFAULT_EVALUATIONS_KBN_URL,
  apiKey,
}: {
  log: ToolingLog;
  url?: string;
  apiKey?: string;
}): KbnClient => {
  const kbnClient = new KbnClient({ log, url });
  if (!apiKey) return kbnClient;
  const baseRequest = kbnClient.request.bind(kbnClient);
  const request: KbnClient['request'] = (params) =>
    baseRequest({
      ...params,
      headers: { Authorization: `ApiKey ${apiKey}`, ...params.headers },
    });
  return Object.assign(kbnClient, { request });
};
