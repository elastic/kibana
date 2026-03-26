/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OriginalRule, RuleMigrationRule } from '../../model/rule_migration.gen';
import type { SiemMigrationResourceBase } from '../../model/common.gen';
import { ResourceIdentifier } from '../../resources';

export class RuleResourceIdentifier extends ResourceIdentifier<RuleMigrationRule> {
  public async fromOriginal(originalRule: OriginalRule): Promise<SiemMigrationResourceBase[]> {
    return this.identifier(originalRule.query);
  }
}
