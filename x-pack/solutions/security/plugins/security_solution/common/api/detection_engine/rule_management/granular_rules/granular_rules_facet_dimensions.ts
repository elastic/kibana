/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GranularRulesFacetCategory } from './granular_rules_contract.gen';

export const RULES_FACET_CATEGORY_TO_ATTRIBUTE: Record<GranularRulesFacetCategory, string> = {
  tags: 'alert.attributes.tags',
  type: 'alert.attributes.alertTypeId',
  enabled: 'alert.attributes.enabled',
  updatedBy: 'alert.attributes.updatedBy',
  createdBy: 'alert.attributes.createdBy',
  lastRunOutcome: 'alert.attributes.lastRun.outcome',
};
