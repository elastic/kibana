/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';

export interface Dependencies {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClient;
  logger: Logger;
  abortController: AbortController;
}

export interface CompletedRunResult {
  aborted: false;
  completed: true;
}

export interface AbortedRunResult<TNextState> {
  aborted: true;
  completed: false;
  nextState: TNextState;
}

export type RunResult<TNextState> = AbortedRunResult<TNextState> | CompletedRunResult;

export function isAbortError(error: unknown, abortController: AbortController): boolean {
  if (error instanceof errors.RequestAbortedError) return true;
  if (abortController.signal.aborted) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return false;
}
