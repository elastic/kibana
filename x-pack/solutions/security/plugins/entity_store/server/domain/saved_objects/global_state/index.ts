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
import { EntityStoreGlobalState, HistorySnapshotState, LogExtractionConfig } from './constants';
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
    // Apply zod defaults to the persisted attributes so that fields added in newer Kibana
    // versions (e.g. `maxTimeWindowSize`) are populated for SOs that were written before the
    // field existed. This avoids `undefined` reaching consumers like `parseDurationToMs`.
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

  async init(
    initialState?: Partial<EntityStoreGlobalState>
  ): Promise<Partial<EntityStoreGlobalState>> {
    const existing = await this.find();
    if (existing !== undefined) {
      return this.updateInternal(this.getSavedObjectId(), initialState ?? {});
    }

    const id = this.getSavedObjectId();
    this.logger.debug(`Creating global state with id ${id}`);

    const historySnapshot = HistorySnapshotState.parse(initialState?.historySnapshot ?? {});
    const logsExtraction = LogExtractionConfig.parse(initialState?.logsExtraction ?? {});
    const defaultState: EntityStoreGlobalState = {
      historySnapshot,
      logsExtraction,
    };
    const parsed = EntityStoreGlobalState.parse(defaultState);

    const { attributes } = await this.soClient.create<EntityStoreGlobalState>(
      EntityStoreGlobalStateTypeName,
      parsed,
      { id }
    );

    return attributes;
  }

  async update(partial: Partial<EntityStoreGlobalState>): Promise<Partial<EntityStoreGlobalState>> {
    await this.findOrThrow();

    const id = this.getSavedObjectId();
    return this.updateInternal(id, partial);
  }

  private async updateInternal(
    id: string,
    partial: Partial<EntityStoreGlobalState>
  ): Promise<Partial<EntityStoreGlobalState>> {
    const { attributes } = await this.soClient.update<EntityStoreGlobalState>(
      EntityStoreGlobalStateTypeName,
      id,
      partial,
      { refresh: 'wait_for', mergeAttributes: true }
    );
    return attributes;
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
    return `entity-store-global-state-${this.namespace}`;
  }

  private findSO(): Promise<SavedObjectsFindResponse<EntityStoreGlobalState>> {
    return this.soClient.find<EntityStoreGlobalState>({
      type: EntityStoreGlobalStateTypeName,
      namespaces: [this.namespace],
      perPage: 1,
    });
  }
}
