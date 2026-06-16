/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient as EsClient, Logger } from '@kbn/core/server';
import type {
  IndexName,
  Names,
  ReindexRequest,
  QueryDslQueryContainer,
  ReindexResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { waitForTaskToComplete } from './wait_for_task';

export interface ReindexOptions {
  source: { index: Names; query?: QueryDslQueryContainer };
  dest: { index: IndexName };
  signal?: AbortSignal;
  waitForCompletion?: boolean;
  logger?: Logger;
  minTimeout?: number;
  maxTimeout?: number;
  forever?: boolean;
}

export const reindex = async (
  esClient: EsClient,
  options: ReindexOptions
): Promise<{ created: number; total: number }> => {
  const { source, dest, signal } = options;
  const body: ReindexRequest = {
    source: { index: source.index, query: source.query },
    dest: { index: dest.index },
    wait_for_completion: options.waitForCompletion ?? true,
    refresh: true,
    conflicts: 'proceed',
  };

  if (options.waitForCompletion === false) {
    const { task } = await esClient.reindex(body, { signal });
    if (task == null) {
      throw new Error('Reindex did not return a task id');
    }
    const response = await waitForTaskToComplete<ReindexResponse>({
      esClient,
      taskId: task,
      logger: options.logger,
      signal,
      minTimeout: options.minTimeout,
      maxTimeout: options.maxTimeout,
      forever: options.forever,
    });
    return { created: response.created ?? 0, total: response.total ?? 0 };
  }

  const response = await esClient.reindex(body, { signal });
  return { created: response.created ?? 0, total: response.total ?? 0 };
};
