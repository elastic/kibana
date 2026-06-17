/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import { ResolutionRuleOverrides } from './constants';
import { EntityStoreResolutionRuleOverridesTypeName } from './types';

export class ResolutionRuleOverridesClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async find(): Promise<ResolutionRuleOverrides | undefined> {
    const response = await this.soClient.find<ResolutionRuleOverrides>({
      type: EntityStoreResolutionRuleOverridesTypeName,
      namespaces: [this.namespace],
      perPage: 1,
    });
    if (response.total === 0) {
      return undefined;
    }
    return ResolutionRuleOverrides.parse(response.saved_objects[0].attributes);
  }

  /**
   * Sets a rule's enabled flag.
   *
   * Idempotent: if the rule is already in the requested state this is a no-op with
   * no SO write (a rule absent from the map counts as enabled). Otherwise it reads
   * the current overrides once, updates this rule's flag in the in-memory map, and
   * writes the whole map back — creating the SO on first use.
   */
  async setEnabled(ruleId: string, enabled: boolean): Promise<ResolutionRuleOverrides> {
    const existing = await this.find();
    const current = existing?.overrides[ruleId]?.enabled ?? true;
    if (current === enabled) {
      return existing ?? ResolutionRuleOverrides.parse({});
    }

    const overrides = {
      ...(existing?.overrides ?? {}),
      [ruleId]: { enabled },
    };

    return existing === undefined ? this.create({ overrides }) : this.writeMerged({ overrides });
  }

  private async writeMerged(
    partial: Partial<ResolutionRuleOverrides>
  ): Promise<ResolutionRuleOverrides> {
    const { attributes } = await this.soClient.update<ResolutionRuleOverrides>(
      EntityStoreResolutionRuleOverridesTypeName,
      this.getSavedObjectId(),
      partial,
      { refresh: 'wait_for', mergeAttributes: true }
    );
    return ResolutionRuleOverrides.parse(attributes);
  }

  private async create(
    partial: Partial<ResolutionRuleOverrides>
  ): Promise<ResolutionRuleOverrides> {
    const id = this.getSavedObjectId();
    this.logger.debug(`Creating resolution rule overrides with id ${id}`);
    const parsed = ResolutionRuleOverrides.parse(partial);
    const { attributes } = await this.soClient.create<ResolutionRuleOverrides>(
      EntityStoreResolutionRuleOverridesTypeName,
      parsed,
      { id, refresh: 'wait_for' }
    );
    return ResolutionRuleOverrides.parse(attributes);
  }

  private getSavedObjectId(): string {
    return `${EntityStoreResolutionRuleOverridesTypeName}-${this.namespace}`;
  }
}
