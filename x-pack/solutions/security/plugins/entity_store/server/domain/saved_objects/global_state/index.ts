/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { HistorySnapshotState, LogExtractionConfig, toLogExtractionOverrides } from './constants';
import type {
  LogExtractionConfigInput,
  StoredEntityStoreGlobalState,
  EntityStoreGlobalState,
} from './constants';
import { EntityStoreGlobalStateTypeName } from './types';
import { retryOnConflict } from '../../../infra/retry_on_conflict';

export class EntityStoreGlobalStateClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async find(): Promise<EntityStoreGlobalState | undefined> {
    const response = await this.findSO();
    return response.total === 0 ? undefined : this.resolve(response.saved_objects[0].attributes);
  }

  async findOrThrow(): Promise<EntityStoreGlobalState> {
    return this.resolve((await this.findSOOrThrow()).attributes);
  }

  async init(initialState?: {
    historySnapshot?: HistorySnapshotState;
    logsExtraction?: LogExtractionConfigInput;
  }): Promise<void> {
    const historySnapshot = HistorySnapshotState.parse(initialState?.historySnapshot ?? {});

    // Ensure the SO exists, then persist overrides via the single write path only when params are given:
    //  - fresh install: create with no overrides, so every field tracks defaults
    //  - re-install with params: overwrite the stored overrides
    //  - re-install without params: leave existing overrides untouched
    const response = await this.findSO();
    if (response.total === 0) {
      const id = this.getSavedObjectId();
      this.logger.debug(`Creating global state with id ${id}`);
      await this.soClient.create<StoredEntityStoreGlobalState>(
        EntityStoreGlobalStateTypeName,
        { historySnapshot, logsExtraction: {} },
        { id, refresh: 'wait_for' }
      );
    } else {
      await this.update({ historySnapshot });
    }

    const logsExtraction = initialState?.logsExtraction;
    if (logsExtraction !== undefined) {
      await retryOnConflict(() => this.writeLogsExtractionOverrides(logsExtraction));
    }
  }

  async update(partial: Partial<StoredEntityStoreGlobalState>): Promise<void> {
    await this.findOrThrow();
    await this.soClient.update<StoredEntityStoreGlobalState>(
      EntityStoreGlobalStateTypeName,
      this.getSavedObjectId(),
      partial,
      { refresh: 'wait_for', mergeAttributes: true }
    );
  }

  /**
   * Persists the config as sparse overrides, replacing `logsExtraction` wholesale (a merge can't
   * remove a field reset to its default). Reads the doc to preserve `historySnapshot` and writes with
   * a version guard, so it throws on a concurrent write — callers retry on conflict where it matters.
   */
  async writeLogsExtractionOverrides(config: Partial<LogExtractionConfig>): Promise<void> {
    const logsExtraction = toLogExtractionOverrides(config);

    const { id, version, attributes } = await this.findSOOrThrow();
    await this.soClient.update<StoredEntityStoreGlobalState>(
      EntityStoreGlobalStateTypeName,
      id,
      { historySnapshot: attributes.historySnapshot, logsExtraction },
      { refresh: 'wait_for', mergeAttributes: false, version }
    );
  }

  async delete(): Promise<void> {
    const response = await this.findSO();
    if (response.total === 0) {
      return;
    }

    try {
      const id = response.saved_objects[0].id;
      this.logger.debug(`Deleting global state with id ${id}`);
      await this.soClient.delete(EntityStoreGlobalStateTypeName, id);
    } catch (error) {
      if (Boom.isBoom(error, 404)) {
        return;
      }
      throw error;
    }
  }

  // Only overrides are persisted; every other field is resolved here from the current defaults.
  private resolve(attributes: StoredEntityStoreGlobalState): EntityStoreGlobalState {
    return {
      historySnapshot: HistorySnapshotState.parse(attributes.historySnapshot ?? {}),
      logsExtraction: LogExtractionConfig.parse(attributes.logsExtraction ?? {}),
    };
  }

  private getSavedObjectId(): string {
    return `${EntityStoreGlobalStateTypeName}-${this.namespace}`;
  }

  private findSO(): Promise<SavedObjectsFindResponse<StoredEntityStoreGlobalState>> {
    return this.soClient.find<StoredEntityStoreGlobalState>({
      type: EntityStoreGlobalStateTypeName,
      namespaces: [this.namespace],
      perPage: 1,
    });
  }

  private async findSOOrThrow() {
    const response = await this.findSO();
    if (response.total === 0) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(
        'No global state found for this namespace'
      );
    }
    return response.saved_objects[0];
  }
}
