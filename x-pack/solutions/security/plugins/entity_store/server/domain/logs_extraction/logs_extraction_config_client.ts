/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isEmpty from 'lodash/isEmpty';
import type { LogExtractionOverridesClient } from '../saved_objects/log_extraction_overrides/client';
import type { EntityStoreGlobalStateClient } from '../saved_objects/global_state';
import type { LogExtractionConfig, LogExtractionOverrides } from './config';
import {
  getLegacyLogExtractionOverrides,
  getLatestLogExtractionOverrides,
  resolveLogExtractionConfig,
} from './config';

export class LogsExtractionConfigClient {
  constructor(
    private readonly overridesClient: LogExtractionOverridesClient,
    private readonly globalStateClient: EntityStoreGlobalStateClient
  ) {}

  private async getOverrides(): Promise<LogExtractionOverrides> {
    const overrides = await this.overridesClient.get();
    if (!isEmpty(overrides)) return overrides;

    // Pre-migration fallback: returns {} once migration clears the legacy field.
    const globalState = await this.globalStateClient.find();
    const legacy = globalState?.logsExtraction;
    return legacy ? getLegacyLogExtractionOverrides(legacy) : {};
  }

  async get(): Promise<LogExtractionConfig> {
    return resolveLogExtractionConfig(await this.getOverrides());
  }

  async init(params?: LogExtractionOverrides): Promise<LogExtractionConfig> {
    if (!isEmpty(params)) {
      return this.update(params);
    }
    return this.get();
  }

  async update(patch: LogExtractionOverrides = {}): Promise<LogExtractionConfig> {
    const existing = await this.getOverrides();
    const overrides = getLatestLogExtractionOverrides({ ...existing, ...patch });
    await this.overridesClient.upsert(overrides);
    return resolveLogExtractionConfig(overrides);
  }

  async delete(): Promise<void> {
    await this.overridesClient.delete();
  }
}
