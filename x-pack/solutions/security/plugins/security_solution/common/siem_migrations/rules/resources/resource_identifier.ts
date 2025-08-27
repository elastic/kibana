/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceIdentifier } from '../../common/resources';
import type { SiemMigrationResourceBase } from '../../model/common.gen';
import type { OriginalRule } from '../../model/rule_migration.gen';

export class RuleResourceIdentifier extends ResourceIdentifier<OriginalRule> {
  public fromOriginal(originalRule: OriginalRule): SiemMigrationResourceBase[] {
    return this.identifier(originalRule.query);
  }
}
