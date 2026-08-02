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
import { EntityStoreGlobalState, HistorySnapshotState } from './constants';
import { EntityStoreGlobalStateTypeName } from './types';

export class EntityStoreGlobalStateClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async find(): Promise<EntityStoreGlobalState | undefined> {
    const response = await this.findSO();
    if (response.total === 0) {
      return undefined;
    }
    return EntityStoreGlobalState.parse(response.saved_objects[0].attributes);
  }

  async findOrThrow(): Promise<EntityStoreGlobalState> {
    const response = await this.find();
    if (response === undefined) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(
        'No global state found for this namespace'
      );
    }
    return response;
  }

  async init(initialState?: {
    historySnapshot?: Partial<HistorySnapshotState>;
  }): Promise<EntityStoreGlobalState> {
    const existing = await this.find();
    if (existing !== undefined) {
      if (initialState?.historySnapshot !== undefined) {
        return this.updateHistorySnapshot(initialState.historySnapshot);
      }
      return existing;
    }

    const id = this.getSavedObjectId();
    this.logger.debug(`Creating global state with id ${id}`);

    const parsed = EntityStoreGlobalState.parse({
      historySnapshot: initialState?.historySnapshot ?? {},
    });

    await this.soClient.create(EntityStoreGlobalStateTypeName, parsed, { id });
    return parsed;
  }

  /** @deprecated Prefer `updateHistorySnapshot` — kept for call-site compatibility. */
  async update(partial: {
    historySnapshot?: Partial<HistorySnapshotState>;
  }): Promise<EntityStoreGlobalState> {
    if (partial.historySnapshot === undefined) {
      return this.findOrThrow();
    }
    return this.updateHistorySnapshot(partial.historySnapshot);
  }

  async updateHistorySnapshot(
    partial: Partial<HistorySnapshotState>
  ): Promise<EntityStoreGlobalState> {
    const existing = await this.findOrThrow();
    const historySnapshot = HistorySnapshotState.parse({
      ...existing.historySnapshot,
      ...partial,
    });

    await this.soClient.update(
      EntityStoreGlobalStateTypeName,
      this.getSavedObjectId(),
      { historySnapshot },
      { refresh: 'wait_for', mergeAttributes: true }
    );

    return { ...existing, historySnapshot };
  }

  /**
   * Drop legacy `logsExtraction` from global state while keeping historySnapshot.
   * Uses full attribute replace so the field is actually removed from the SO.
   */
  async clearLogsExtraction(): Promise<void> {
    const existing = await this.find();
    if (existing === undefined || existing.logsExtraction === undefined) {
      return;
    }

    const next: EntityStoreGlobalState = {
      historySnapshot: existing.historySnapshot,
    };

    await this.soClient.update(EntityStoreGlobalStateTypeName, this.getSavedObjectId(), next, {
      refresh: 'wait_for',
      mergeAttributes: false,
    });
    this.logger.debug('Cleared legacy logsExtraction from global state');
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

  private getSavedObjectId(): string {
    return `${EntityStoreGlobalStateTypeName}-${this.namespace}`;
  }

  private findSO(): Promise<SavedObjectsFindResponse<EntityStoreGlobalState>> {
    return this.soClient.find<EntityStoreGlobalState>({
      type: EntityStoreGlobalStateTypeName,
      namespaces: [this.namespace],
      perPage: 1,
    });
  }
}
