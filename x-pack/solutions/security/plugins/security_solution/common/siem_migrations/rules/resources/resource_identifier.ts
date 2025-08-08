/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// TODO: move resource related types to migration.gen.ts
import type { RuleMigrationResourceBase, RuleMigrationRule } from '../../model/rule_migration.gen';
import { ResourceIdentifier } from '../../resources/resource_identifier';
import type { SiemMigrationVendor } from '../../types';

export class RuleResourceIdentifier extends ResourceIdentifier<RuleMigrationRule> {
  protected getVendor(): SiemMigrationVendor {
    return this.item.original_rule.vendor;
  }

  public fromOriginal(rule?: RuleMigrationRule): RuleMigrationResourceBase[] {
    const originalRule = rule?.original_rule ?? this.item.original_rule;
    return this.identifier(originalRule.query);
  }
}
