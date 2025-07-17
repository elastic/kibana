/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import type { InferenceClient } from '@kbn/inference-common';
import type { IndexAdapter, IndexPatternAdapter } from '@kbn/index-adapter';
import type {
  RuleMigration,
  RuleMigrationRule,
  RuleMigrationTranslationResult,
  UpdateRuleMigrationRule,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import { type RuleMigrationResource } from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleVersions } from './data/rule_migrations_data_prebuilt_rules_client';
import type { Stored } from '../types';

export type StoredSiemMigration = Stored<RuleMigration>;

export type StoredRuleMigration = Stored<RuleMigrationRule>;
export type StoredRuleMigrationResource = Stored<RuleMigrationResource>;

export interface SiemRuleMigrationsClientDependencies {
  inferenceClient: InferenceClient;
  rulesClient: RulesClient;
  actionsClient: ActionsClient;
  savedObjectsClient: SavedObjectsClientContract;
  packageService?: PackageService;
  telemetry: AnalyticsServiceSetup;
}

export interface RuleMigrationIntegration {
  id: string;
  title: string;
  description: string;
  data_streams: Array<{ dataset: string; title: string; index_pattern: string }>;
  elser_embedding: string;
}

export interface RuleMigrationPrebuiltRule {
  rule_id: string;
  name: string;
  description: string;
  elser_embedding: string;
  mitre_attack_ids?: string[];
}

export type RuleSemanticSearchResult = RuleMigrationPrebuiltRule & RuleVersions;

export type InternalUpdateRuleMigrationRule = UpdateRuleMigrationRule & {
  translation_result?: RuleMigrationTranslationResult;
};

/**
 *
 * Based on the severity levels defined in the Splunk Common Information Model (CIM) documentation
 *
 * https://docs.splunk.com/Documentation/CIM/6.0.2/User/Alerts
 *
 * '1': 'INFO';
 * '2': 'LOW';
 * '3': 'MEDIUM';
 * '4': 'HIGH';
 * '5': 'CRITICAL';
 *
 **/
export type SplunkSeverity = '1' | '2' | '3' | '4' | '5';

export interface Adapters {
  rules: IndexPatternAdapter;
  resources: IndexPatternAdapter;
  integrations: IndexAdapter;
  prebuiltrules: IndexAdapter;
  migrations: IndexPatternAdapter;
}

export type AdapterId = keyof Adapters;

export type IndexNameProvider = () => Promise<string>;
export type IndexNameProviders = Record<AdapterId, IndexNameProvider>;
