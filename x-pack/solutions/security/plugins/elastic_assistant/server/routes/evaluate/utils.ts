/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, Example } from 'langsmith';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';
import { isEmpty } from 'lodash';

/**
 * Fetches a dataset from LangSmith. Note that `client` will use env vars unless langSmithApiKey is specified
 *
 * @param datasetName
 * @param logger
 * @param langSmithApiKey
 */
export const fetchLangSmithDataset = async (
  datasetName: string | undefined,
  logger: Logger,
  langSmithApiKey?: string
): Promise<Example[]> => {
  if (datasetName === undefined || (langSmithApiKey == null && !isLangSmithEnabled())) {
    throw new Error('LangSmith dataset name not provided or LangSmith not enabled');
  }

  try {
    const client = new Client({ apiKey: langSmithApiKey });

    const examples = [];
    for await (const example of client.listExamples({ datasetName })) {
      examples.push(example);
    }

    return examples;
  } catch (e) {
    logger.error(`Error fetching dataset from LangSmith: ${e.message}`);
    return [];
  }
};

/**
 * Fetches all LangSmith datasets.  Note that `client` will use env vars unless langSmithApiKey is specified
 *
 * @param logger
 * @param langSmithApiKey
 */
export const fetchLangSmithDatasets = async ({
  logger,
  langSmithApiKey,
}: {
  logger: Logger;
  langSmithApiKey?: string;
}): Promise<string[]> => {
  try {
    const client = new Client(!isEmpty(langSmithApiKey) ? { apiKey: langSmithApiKey } : undefined);
    const datasets = [];
    for await (const dataset of client.listDatasets()) {
      datasets.push(dataset);
    }

    return datasets.map((d) => d.name).sort();
  } catch (e) {
    logger.debug(`Error fetching datasets from LangSmith: ${e.message}`);
    return [];
  }
};

export const EVALUATION_RESULTS_INDEX = '.kibana_elastic-ai-assistant-evaluations-default';
export const EVALUATION_RESULTS_ILM_POLICY = 'security-assistant-evaluation-data-policy';
export const EvaluationStatus = {
  RUNNING: 'running',
  COMPLETE: 'complete',
  UNKNOWN: 'unknown',
} as const;
export type EvaluationStatus = (typeof EvaluationStatus)[keyof typeof EvaluationStatus];

/**
 * Asynchronously retrieves evaluation results from the Elasticsearch index.
 *
 * @param {Object} params - The function parameters.
 * @param {ElasticsearchClient} params.esClientInternalUser - The Elasticsearch client used to perform the search query.
 * @param {Logger} params.logger - The logger instance used to log errors if the operation fails.
 * @returns {Promise<Array<{ id: string; status: EvaluationStatus }>>} A promise that resolves to an array of evaluation results,
 *   each containing an `id` and `status`. If an error occurs, an empty array is returned.
 */
export const getEvaluationResults = async ({
  esClientInternalUser,
  logger,
}: {
  esClientInternalUser: ElasticsearchClient;
  logger: Logger;
}): Promise<Array<{ id: string; status: EvaluationStatus }>> => {
  try {
    const resp = await esClientInternalUser.search<{
      evaluation_id: string;
      status: EvaluationStatus;
    }>({
      index: EVALUATION_RESULTS_INDEX,
      size: 100,
      _source: ['evaluation_id', 'status'],
      query: { match_all: {} },
    });

    return (
      resp.hits.hits.map((hit) => ({
        id: hit._source?.evaluation_id ?? '',
        status: hit._source?.status ?? EvaluationStatus.UNKNOWN,
      })) || []
    );
  } catch (e) {
    logger.error(`Error fetching evaluation results: ${e.message}`);
    return [];
  }
};

/**
 * Sets up the evaluation index and ILM (Index Lifecycle Management) policy for storing
 * evaluation data in Elasticsearch. This function ensures that the required ILM policy
 * and index are created if they do not already exist.
 *
 * @param {Object} params - An object containing the necessary dependencies.
 * @param {ElasticsearchClient} params.esClientInternalUser - The Elasticsearch client used to interact with the Elasticsearch cluster.
 * @param {Logger} params.logger - The logger instance used for logging actions and errors.
 * @returns {Promise<void>} A promise that resolves when the setup process is complete.
 */
export const setupEvaluationIndex = async ({
  esClientInternalUser,
  logger,
}: {
  esClientInternalUser: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  try {
    // Check if ILM policy exists
    const ilmExists = await esClientInternalUser.ilm
      .getLifecycle({ name: EVALUATION_RESULTS_ILM_POLICY })
      .catch(() => null);
    if (!ilmExists || !ilmExists[EVALUATION_RESULTS_ILM_POLICY]) {
      await esClientInternalUser.ilm.putLifecycle({
        name: EVALUATION_RESULTS_ILM_POLICY,
        policy: {
          phases: {
            hot: { actions: {} },
            delete: { min_age: '1d', actions: { delete: {} } },
          },
        },
      });
    } else {
      logger.info('Evaluation results ILM already exists');
    }

    // Check if the index exists
    const indexExists = await esClientInternalUser.indices.exists({
      index: EVALUATION_RESULTS_INDEX,
    });
    if (!indexExists) {
      await esClientInternalUser.indices.create({
        index: EVALUATION_RESULTS_INDEX,
        settings: {
          'index.lifecycle.name': EVALUATION_RESULTS_ILM_POLICY,
        },
      });
      logger.info('Evaluation results index already exists');
    } else {
      logger.info('Evaluation results index already exists');
    }
  } catch (e) {
    logger.error(`Error setting up evaluation results index/ILM: ${e.message}`);
  }
};

/**
 * Creates or updates evaluation result documents in the evaluation results index.
 * Each result is indexed using its `id` as the document ID, allowing for upsert behavior.
 * Errors during indexing are logged but do not interrupt processing of other results.
 *
 * @param {Object} params - The function parameters.
 * @param {Array<{ id: string; status: EvaluationStatus }>} params.evaluationResults - Array of evaluation results to index or update.
 * @param {ElasticsearchClient} params.esClientInternalUser - Elasticsearch client instance for performing index operations.
 * @param {Logger} params.logger - Logger instance for error reporting.
 * @returns {Promise<void>} A promise that resolves when all results have been processed.
 */
export const createOrUpdateEvaluationResults = async ({
  evaluationResults,
  esClientInternalUser,
  logger,
}: {
  evaluationResults: Array<{ id: string; status: EvaluationStatus }>;
  esClientInternalUser: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  for (const result of evaluationResults) {
    try {
      await esClientInternalUser.index({
        index: EVALUATION_RESULTS_INDEX,
        id: result.id,
        document: {
          '@timestamp': new Date().toISOString(),
          evaluation_id: result.id,
          status: result.status,
        },
        refresh: 'wait_for',
      });
    } catch (e) {
      logger.error(`Failed to index evaluation result ${result.id}: ${e.message}`);
    }
  }
};
