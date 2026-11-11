/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BulkCreateRulesError,
  type IRulesManagementClient,
  type RuleOwnershipTagPrefix,
  type SignificantEventsRuleDefinition,
} from '../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';

type RunAsAccount = <T>(fn: (accountRules: IRulesManagementClient) => Promise<T>) => Promise<T>;

/**
 * Manages the detection engine's rules so that they belong to the space's account. A rule runs on
 * the key of whoever created or last enabled it, so creates, updates and enables run as the
 * account, and each is followed by a re-key, because an update or a repeated enable leaves the old
 * key in place. Reads, disables and deletes assign no key and stay with the caller, so turning rules off
 * keeps working without the account.
 */
export class DetectionEngineRulesClient implements IRulesManagementClient {
  private readonly caller: IRulesManagementClient;
  private readonly runAsAccount: RunAsAccount;

  constructor({
    caller,
    runAsAccount,
  }: {
    caller: IRulesManagementClient;
    runAsAccount: RunAsAccount;
  }) {
    this.caller = caller;
    this.runAsAccount = runAsAccount;
  }

  createRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void> {
    return this.runAsAccount(async (rules) => {
      await rules.createRule(id, definition);
      // A create that finds the rule already there updates it, which keeps the old key.
      await rules.rotateRulesApiKey([id]);
    });
  }

  bulkCreateRules(
    rules: Array<{ id: string; definition: SignificantEventsRuleDefinition }>
  ): Promise<{ createdIds: string[] }> {
    return this.runAsAccount(async (accountRules) => {
      const result = await accountRules.bulkCreateRules(rules);
      // Only the rules that were updated in place keep their old key; created ones have the account's.
      const created = new Set(result.createdIds);
      const updatedIds = rules.map(({ id }) => id).filter((id) => !created.has(id));
      try {
        await accountRules.rotateRulesApiKey(updatedIds);
      } catch (error) {
        // The rules were already written. Keep the created ids in the error so the caller can
        // delete them when it rolls the batch back; a plain error would hide them.
        throw new BulkCreateRulesError(
          error instanceof Error ? error : new Error(String(error)),
          result.createdIds,
          updatedIds,
          []
        );
      }
      return result;
    });
  }

  // An update creates the rule when it is missing.
  updateRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void> {
    return this.runAsAccount(async (rules) => {
      await rules.updateRule(id, definition);
      await rules.rotateRulesApiKey([id]);
    });
  }

  setRulesEnabled(ids: string[], enabled: boolean): Promise<void> {
    // Nothing to do, and no reason to mint the account's credential or fail a space that is not set up.
    if (ids.length === 0) {
      return Promise.resolve();
    }
    return enabled
      ? this.runAsAccount(async (rules) => {
          await rules.setRulesEnabled(ids, true);
          // Bulk enable skips rules that are already on, so they keep the previous owner's key.
          await rules.rotateRulesApiKey(ids);
        })
      : this.caller.setRulesEnabled(ids, false);
  }

  rotateRulesApiKey(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return Promise.resolve();
    }
    return this.runAsAccount((rules) => rules.rotateRulesApiKey(ids));
  }

  bulkDeleteRules(ids: string[]): Promise<void> {
    return this.caller.bulkDeleteRules(ids);
  }

  findRuleEnabledStates(ids: string[]): Promise<Map<string, boolean>> {
    return this.caller.findRuleEnabledStates(ids);
  }

  findExistingRuleIds(ids: string[]): Promise<string[]> {
    return this.caller.findExistingRuleIds(ids);
  }

  findOwnedRuleIds(sourceId: string): Promise<string[]> {
    return this.caller.findOwnedRuleIds(sourceId);
  }

  findSourceIdsWithOwnedRules(): Promise<string[]> {
    return this.caller.findSourceIdsWithOwnedRules();
  }

  findRuleIdsByTagPrefix(prefix: RuleOwnershipTagPrefix): Promise<string[]> {
    return this.caller.findRuleIdsByTagPrefix(prefix);
  }
}
