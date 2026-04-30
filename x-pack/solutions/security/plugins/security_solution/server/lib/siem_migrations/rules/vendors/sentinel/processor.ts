/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelRule } from '../../../../../../common/siem_migrations/parsers/sentinel/types';
import type { CreateRuleMigrationRulesInput } from '../../data/rule_migrations_data_rules_client';
import type { VendorProcessor, VendorProcessorContext } from '../types';
import { transformSentinelRuleToOriginalRule } from './transforms';

type SentinelProcessorType = 'rules';

type SentinelRulesProcessor = (rules: SentinelRule[]) => CreateRuleMigrationRulesInput[];

type SentinelProcessorFn<T extends SentinelProcessorType = 'rules'> = T extends 'rules'
  ? SentinelRulesProcessor
  : never;

type SentinelGetProcessor<T extends SentinelProcessorType = 'rules'> = (
  type: T
) => SentinelProcessorFn<T>;

export class SentinelProcessor implements VendorProcessor<SentinelGetProcessor> {
  constructor(private readonly context: VendorProcessorContext) {}

  getProcessor<T extends SentinelProcessorType>(type: T): SentinelProcessorFn<T> {
    switch (type) {
      case 'rules':
        return this.processRules.bind(this) as SentinelProcessorFn<T>;
      default:
        throw new Error(`Unsupported Sentinel processor type: ${type}`);
    }
  }

  processRules(rules: SentinelRule[]): CreateRuleMigrationRulesInput[] {
    return rules.map((rule) => ({
      original_rule: transformSentinelRuleToOriginalRule(rule),
      migration_id: this.context.migrationId,
    }));
  }
}
