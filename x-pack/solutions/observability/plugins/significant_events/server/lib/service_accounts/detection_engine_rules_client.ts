/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRulesManagementClient,
  RuleOwnershipTagPrefix,
  SignificantEventsRuleDefinition,
} from '../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';

type RunAsAccount = <T>(fn: (accountRules: IRulesManagementClient) => Promise<T>) => Promise<T>;

/**
 * Manages the detection engine's rules so that they belong to the space's account. A rule runs on
 * the key of whoever created or last enabled it, so creates, updates and enables run as the
 * account. Reads, disables and deletes assign no key and stay with the caller, so turning rules off
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
    return this.runAsAccount((rules) => rules.createRule(id, definition));
  }

  bulkCreateRules(
    rules: Array<{ id: string; definition: SignificantEventsRuleDefinition }>
  ): Promise<{ createdIds: string[] }> {
    return this.runAsAccount((accountRules) => accountRules.bulkCreateRules(rules));
  }

  // An update creates the rule when it is missing.
  updateRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void> {
    return this.runAsAccount((rules) => rules.updateRule(id, definition));
  }

  setRulesEnabled(ids: string[], enabled: boolean): Promise<void> {
    return enabled
      ? this.runAsAccount((rules) => rules.setRulesEnabled(ids, true))
      : this.caller.setRulesEnabled(ids, false);
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
