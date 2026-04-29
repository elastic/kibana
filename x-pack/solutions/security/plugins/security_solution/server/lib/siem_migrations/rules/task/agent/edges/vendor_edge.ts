/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginalRule } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { MigrateRuleState } from '../types';

export function getVendorRouter(vendor: OriginalRule['vendor']) {
  return function qradarConditionalEdge(state: MigrateRuleState): string {
    if (state.original_rule.vendor === vendor) {
      return `is_${vendor}`;
    }
    return `is_not_${vendor}`;
  };
}
