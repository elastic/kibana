/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UpdateRuleMigrationData,
  RuleMigrationTranslationResult,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import {
  type RuleMigration,
  type RuleMigrationResource,
} from '../../../../common/siem_migrations/model/rule_migration.gen';

export type Stored<T extends object> = T & { id: string };

export type StoredRuleMigration = Stored<RuleMigration>;
export type StoredRuleMigrationResource = Stored<RuleMigrationResource>;

export interface RuleMigrationIntegration {
  id: string;
  title: string;
  description: string;
  data_streams: Array<{ dataset: string; title: string; index_pattern: string }>;
  elser_embedding: string;
}

export interface RuleMigrationPrebuiltRule {
  rule_id: string;
  installed_rule_id?: string;
  name: string;
  description: string;
  elser_embedding: string;
  mitre_attack_ids?: string[];
}

export type InternalUpdateRuleMigrationData = UpdateRuleMigrationData & {
  translation_result?: RuleMigrationTranslationResult;
};
