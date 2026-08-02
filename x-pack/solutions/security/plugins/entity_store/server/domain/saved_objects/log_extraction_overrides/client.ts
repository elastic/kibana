/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { LogExtractionOverrides } from '../../logs_extraction/config';
import { LogExtractionOverridesTypeName } from './types';

export class LogExtractionOverridesClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string
  ) {}

  async get(): Promise<LogExtractionOverrides> {
    try {
      const so = await this.soClient.get<LogExtractionOverrides>(
        LogExtractionOverridesTypeName,
        this.getSavedObjectId()
      );
      return LogExtractionOverrides.parse(so.attributes ?? {});
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return {};
      }
      throw error;
    }
  }

  async upsert(overrides: LogExtractionOverrides): Promise<void> {
    await this.soClient.create(
      LogExtractionOverridesTypeName,
      LogExtractionOverrides.parse(overrides),
      { id: this.getSavedObjectId(), overwrite: true, refresh: 'wait_for' }
    );
  }

  async delete(): Promise<void> {
    try {
      await this.soClient.delete(LogExtractionOverridesTypeName, this.getSavedObjectId());
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return;
      }
      throw error;
    }
  }

  private getSavedObjectId(): string {
    return `${LogExtractionOverridesTypeName}-${this.namespace}`;
  }
}
