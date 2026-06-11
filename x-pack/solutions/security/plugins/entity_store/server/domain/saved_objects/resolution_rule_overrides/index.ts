/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import { ResolutionRuleOverridesTypeName, type ResolutionRuleOverridesAttributes } from './types';

export class ResolutionRuleOverridesClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async getOverrides(): Promise<Record<string, boolean>> {
    const response = await this.soClient.find<ResolutionRuleOverridesAttributes>({
      type: ResolutionRuleOverridesTypeName,
      namespaces: [this.namespace],
      perPage: 1,
    });

    if (response.total === 0) {
      return {};
    }

    return response.saved_objects[0].attributes.overrides ?? {};
  }

  async setRuleEnabled(ruleId: string, enabled: boolean): Promise<void> {
    const id = this.getSavedObjectId();
    const response = await this.soClient.find<ResolutionRuleOverridesAttributes>({
      type: ResolutionRuleOverridesTypeName,
      namespaces: [this.namespace],
      perPage: 1,
    });

    if (response.total === 0) {
      this.logger.debug(`Creating resolution rule overrides SO for namespace ${this.namespace}`);
      await this.soClient.create<ResolutionRuleOverridesAttributes>(
        ResolutionRuleOverridesTypeName,
        { overrides: { [ruleId]: enabled } },
        { id }
      );
      return;
    }

    const existing = response.saved_objects[0];
    const updatedOverrides = { ...existing.attributes.overrides, [ruleId]: enabled };
    await this.soClient.update<ResolutionRuleOverridesAttributes>(
      ResolutionRuleOverridesTypeName,
      existing.id,
      { overrides: updatedOverrides },
      { mergeAttributes: false }
    );
  }

  private getSavedObjectId(): string {
    return `${ResolutionRuleOverridesTypeName}-${this.namespace}`;
  }
}

export { ResolutionRuleOverridesTypeName, ResolutionRuleOverridesType } from './types';
