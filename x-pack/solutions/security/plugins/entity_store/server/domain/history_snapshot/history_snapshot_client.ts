/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import moment from 'moment';
import type { EntityStoreGlobalState } from '../saved_objects';
import type { EntityStoreGlobalStateClient } from '../saved_objects';
import { createIndex, reindex, updateByQueryWithScript } from '../../infra/elasticsearch';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import { getErrorMessage } from '../../../common';
import { getHistorySnapshotIndexName } from '../asset_manager/history_snapshot_index';
import { HISTORY_SNAPSHOT_RESET_SCRIPT } from './constants';

export type RunHistorySnapshotResult =
  | { ok: true; historySnapshotIndex: string; docCount: number; resetCount: number }
  | { ok: true; skipped: true }
  | { ok: false; error: Error };

export interface RunHistorySnapshotOptions {
  abortSignal?: AbortSignal;
}

export { HISTORY_SNAPSHOT_RESET_SCRIPT } from './constants';

const HISTORY_SNAPSHOT_TIMEOUT_MS = 2 * 60 * 1000;

export interface HistorySnapshotClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
  globalStateClient: EntityStoreGlobalStateClient;
}

export class HistorySnapshotClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;
  private readonly globalStateClient: EntityStoreGlobalStateClient;

  constructor({
    logger,
    esClient,
    namespace,
    globalStateClient,
  }: HistorySnapshotClientDependencies) {
    this.logger = logger;
    this.esClient = esClient;
    this.namespace = namespace;
    this.globalStateClient = globalStateClient;
  }

  public async runHistorySnapshot(
    options: RunHistorySnapshotOptions = {}
  ): Promise<RunHistorySnapshotResult> {
    const { abortSignal } = options;

    const globalState = await this.globalStateClient.findOrThrow();

    if (globalState.historySnapshot?.status !== 'started') {
      this.logger.debug('History snapshot status is not started, skipping run');
      return { ok: true, skipped: true };
    }

    const timestampNow = moment.utc().toISOString();
    const snapshotDate = moment.utc().toDate();
    const latestIndex = getLatestEntitiesIndexName(this.namespace);
    const historySnapshotIndex = getHistorySnapshotIndexName(this.namespace, snapshotDate);

    try {
      await createIndex(this.esClient, historySnapshotIndex, { throwIfExists: false });
    } catch (err) {
      return this.handleOperationError('create index', err, globalState);
    }

    let reindexResult: { created: number; total: number };
    try {
      reindexResult = await reindex(this.esClient, {
        source: { index: latestIndex },
        dest: { index: historySnapshotIndex },
        signal: abortSignal,
        requestTimeout: HISTORY_SNAPSHOT_TIMEOUT_MS,
      });
    } catch (err) {
      return this.handleOperationError('reindex', err, globalState);
    }

    const { total: docCount } = reindexResult;
    if (docCount === 0) {
      await this.updateGlobalStateOnSuccess(globalState);
      return { ok: true, historySnapshotIndex, docCount: 0, resetCount: 0 };
    }

    let updateResult: { updated: number; total: number };
    try {
      updateResult = await updateByQueryWithScript(this.esClient, {
        index: latestIndex,
        query: { match_all: {} },
        script: HISTORY_SNAPSHOT_RESET_SCRIPT,
        params: { timestampNow },
        signal: abortSignal,
        requestTimeout: HISTORY_SNAPSHOT_TIMEOUT_MS,
      });
    } catch (err) {
      return this.handleOperationError('update by query', err, globalState);
    }

    await this.updateGlobalStateOnSuccess(globalState);
    return {
      ok: true,
      historySnapshotIndex,
      docCount,
      resetCount: updateResult.updated,
    };
  }

  private async handleOperationError(
    operation: string,
    err: unknown,
    globalState: EntityStoreGlobalState
  ): Promise<RunHistorySnapshotResult> {
    const message = getErrorMessage(err);
    this.logger.error(`history snapshot failed during ${operation}: ${message}`);
    await this.updateGlobalStateOnError(globalState, new Error(message));
    return { ok: false, error: new Error(`History snapshot failed during ${operation}`) };
  }

  private async updateGlobalStateOnSuccess(globalState: EntityStoreGlobalState): Promise<void> {
    try {
      await this.globalStateClient.update({
        historySnapshot: {
          ...globalState.historySnapshot,
          lastExecutionTimestamp: moment.utc().toISOString(),
          lastError: undefined,
        },
      });
    } catch (updateErr) {
      this.logger.error(
        `history snapshot: failed to update global state: ${getErrorMessage(updateErr)}`
      );
    }
  }

  private async updateGlobalStateOnError(
    globalState: EntityStoreGlobalState,
    error: Error
  ): Promise<void> {
    try {
      await this.globalStateClient.update({
        historySnapshot: {
          ...globalState.historySnapshot,
          lastError: {
            message: error.message,
            timestamp: moment.utc().toISOString(),
          },
        },
      });
    } catch (updateErr) {
      this.logger.error(
        `history snapshot: failed to update global state: ${getErrorMessage(updateErr)}`
      );
    }
  }
}
