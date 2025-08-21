/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// TODO: move resource related types to migration.gen.ts
import type { OriginalRule, RuleMigrationResourceBase } from '../../model/rule_migration.gen';
import { ResourceIdentifier } from '../../resources/resource_identifier';

export class RuleResourceIdentifier extends ResourceIdentifier<OriginalRule> {
  public fromOriginal(originalRule: OriginalRule): RuleMigrationResourceBase[] {
    return this.identifier(originalRule.query);
  }
}
