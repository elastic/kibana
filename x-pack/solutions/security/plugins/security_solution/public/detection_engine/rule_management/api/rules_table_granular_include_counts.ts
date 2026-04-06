/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GranularRulesFacetCategory } from '../../../../common/api/detection_engine/rule_management';

/**
 * Facet dimensions requested with the rules table `_find_granular` call (filter-toolbar dimensions).
 */
export const RULES_TABLE_GRANULAR_INCLUDE_COUNTS: GranularRulesFacetCategory[] = [
  'tags',
  'enabled',
  'type',
  'customization_status',
  'execution_status',
];
