/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import { ResolutionDisabledRules } from './constants';
import { EntityStoreResolutionDisabledRulesTypeName } from './types';

/**
 * Reads and updates the enabled state of the out-of-the-box resolution rules.
 *
 * The state is persisted as a per-namespace list of disabled rule ids (the
 * `entity-store-resolution-disabled-rules` saved object), but callers don't deal
 * with that shape — they enable/disable a rule by id and read the disabled ids.
 */
export class ResolutionRulesClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  /** Ids of rules that are currently disabled (empty when none are). */
  async getDisabledRuleIds(): Promise<string[]> {
    return (await this.find())?.disabledRuleIds ?? [];
  }

  /** Enables a rule. Idempotent — a no-op when the rule is already enabled. */
  async enable(ruleId: string): Promise<void> {
    await this.setDisabled(ruleId, false);
  }

  /** Disables a rule. Idempotent — a no-op when the rule is already disabled. */
  async disable(ruleId: string): Promise<void> {
    await this.setDisabled(ruleId, true);
  }

  private async find(): Promise<ResolutionDisabledRules | undefined> {
    const response = await this.soClient.find<ResolutionDisabledRules>({
      type: EntityStoreResolutionDisabledRulesTypeName,
      namespaces: [this.namespace],
      perPage: 1,
    });
    if (response.total === 0) {
      return undefined;
    }
    return ResolutionDisabledRules.parse(response.saved_objects[0].attributes);
  }

  // Adds/removes the id from the disabled list. No-op (no SO write) when the rule
  // is already in the requested state. Reads once, then writes the list back —
  // creating the SO on first use.
  private async setDisabled(ruleId: string, disabled: boolean): Promise<void> {
    const existing = await this.find();
    const current = existing?.disabledRuleIds ?? [];

    if (current.includes(ruleId) === disabled) {
      return;
    }

    const disabledRuleIds = disabled ? [...current, ruleId] : current.filter((id) => id !== ruleId);

    if (existing === undefined) {
      await this.create(disabledRuleIds);
    } else {
      await this.writeMerged(disabledRuleIds);
    }
  }

  private async writeMerged(disabledRuleIds: string[]): Promise<void> {
    await this.soClient.update<ResolutionDisabledRules>(
      EntityStoreResolutionDisabledRulesTypeName,
      this.getSavedObjectId(),
      { disabledRuleIds },
      { refresh: 'wait_for', mergeAttributes: true }
    );
  }

  private async create(disabledRuleIds: string[]): Promise<void> {
    const id = this.getSavedObjectId();
    this.logger.debug(`Creating resolution disabled rules with id ${id}`);
    await this.soClient.create<ResolutionDisabledRules>(
      EntityStoreResolutionDisabledRulesTypeName,
      ResolutionDisabledRules.parse({ disabledRuleIds }),
      { id, refresh: 'wait_for' }
    );
  }

  private getSavedObjectId(): string {
    return `${EntityStoreResolutionDisabledRulesTypeName}-${this.namespace}`;
  }
}
