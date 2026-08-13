/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelRule } from '../../../../../../common/siem_migrations/parsers/sentinel/types';
import type { SiemMigrationResourceData } from '../../../../../../common/siem_migrations/model/common.gen';
import type { CreateRuleMigrationRulesInput } from '../../data/rule_migrations_data_rules_client';
import type { VendorProcessor, VendorProcessorContext } from '../types';
import { transformSentinelRuleToOriginalRule } from './transforms';
import { transformSentinelWatchlistResource } from './watchlists';

type SentinelProcessorType = 'rules' | 'resources';

type SentinelRulesProcessor = (rules: SentinelRule[]) => CreateRuleMigrationRulesInput[];
type SentinelResourcesProcessor = (
  resources: SiemMigrationResourceData[]
) => SiemMigrationResourceData[];

type SentinelProcessorFn<T extends SentinelProcessorType = 'rules'> = T extends 'rules'
  ? SentinelRulesProcessor
  : SentinelResourcesProcessor;

type SentinelGetProcessor<T extends SentinelProcessorType = 'rules'> = (
  type: T
) => SentinelProcessorFn<T>;

export class SentinelProcessor implements VendorProcessor<SentinelGetProcessor> {
  constructor(private readonly context: VendorProcessorContext) {}

  getProcessor<T extends SentinelProcessorType>(type: T): SentinelProcessorFn<T> {
    switch (type) {
      case 'rules':
        return this.processRules.bind(this) as SentinelProcessorFn<T>;
      case 'resources':
        return this.processResources.bind(this) as SentinelProcessorFn<T>;
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

  processResources(resources: SiemMigrationResourceData[]): SiemMigrationResourceData[] {
    return resources.map(transformSentinelWatchlistResource);
  }
}
