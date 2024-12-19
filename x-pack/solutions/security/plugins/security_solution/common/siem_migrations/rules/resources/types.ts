/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OriginalRule,
  RuleMigrationResourceBase,
  RuleMigrationResourceData,
} from '../../model/rule_migration.gen';

export type ResourceIdentifier = (input: string) => RuleMigrationResourceBase[];

export interface ResourceIdentifiers {
  fromOriginalRule: (originalRule: OriginalRule) => RuleMigrationResourceBase[];
  fromResource: (resource: RuleMigrationResourceData) => RuleMigrationResourceBase[];
}
