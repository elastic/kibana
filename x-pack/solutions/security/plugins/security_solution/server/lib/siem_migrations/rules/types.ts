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
import type { InferenceClient } from '@kbn/inference-plugin/server';
import type {
  RuleMigrationTranslationResult,
  UpdateRuleMigrationData,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import {
  type RuleMigration,
  type RuleMigrationResource,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleVersions } from './data/rule_migrations_data_prebuilt_rules_client';

export type Stored<T extends object> = T & { id: string };

export type StoredRuleMigration = Stored<RuleMigration>;
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

export type InternalUpdateRuleMigrationData = UpdateRuleMigrationData & {
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
