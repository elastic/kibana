/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GranularRulesFacetCategory } from './granular_rules_contract.gen';

export const RULES_FILTER_NAME_TO_ATTRIBUTE: Record<GranularRulesFacetCategory, string> = {
  tags: 'alert.attributes.tags',
  type: 'alert.attributes.alertTypeId',
  enabled: 'alert.attributes.enabled',
  name: 'alert.attributes.name',
  gapFillStatuses: 'kibana.alert.rule.gap.status',
  updatedAt: 'alert.attributes.updatedAt',
  updatedBy: 'alert.attributes.updatedBy',
  createdAt: 'alert.attributes.createdAt',
  createdBy: 'alert.attributes.createdBy',
  lastRunOutcome: 'alert.attributes.lastRun.outcome',
  lastRunDuration: 'alert.attributes.lastRun.duration',
  lastRunError: 'alert.attributes.lastRun.error',
  lastRunWarning: 'alert.attributes.lastRun.warning',
  lastRunStatus: 'alert.attributes.lastRun.status',
  lastRunStatusReason: 'alert.attributes.lastRun.statusReason',
  lastRunStatusReasonType: 'alert.attributes.lastRun.statusReason.type',
  lastRunStatusReasonMessage: 'alert.attributes.lastRun.statusReason.message',
  lastRunStatusReasonCode: 'alert.attributes.lastRun.statusReason.code',
};
