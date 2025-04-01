/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleParams } from '../../rule_schema';

export const createRuleMock = (params: Partial<RuleParams>) => ({
  actions: [],
  author: [],
  buildingBlockType: undefined,
  createdAt: '2020-01-10T21:11:45.839Z',
  createdBy: 'elastic',
  description: '24/7',
  enabled: true,
  timestampField: undefined,
  eventCategoryOverride: undefined,
  tiebreakerField: undefined,
  exceptionsList: [],
  falsePositives: [],
  filters: [],
  from: 'now-300s',
  id: 'cf1f6a49-18a3-4794-aad7-0e8482e075e9',
  immutable: false,
  index: ['auditbeat-*'],
  interval: '5m',
  language: 'kuery',
  license: 'basic',
  maxSignals: 100,
  meta: { from: '0m' },
  name: 'Home Grown!',
  note: '# this is some markdown documentation',
  outputIndex: '.siem-signals-default',
  query: '',
  riskScore: 21,
  riskScoreMapping: [],
  references: [],
  ruleId: 'b5ba41ab-aaf3-4f43-971b-bdf9434ce0ea',
  ruleNameOverride: undefined,
  savedId: "Garrett's IP",
  tags: [],
  threat: [],
  throttle: 'no_actions',
  timelineId: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
  timelineTitle: 'Untitled timeline',
  timestampOverride: undefined,
  to: 'now',
  type: 'query',
  severity: 'low',
  severityMapping: [],
  updatedAt: '2020-01-10T21:11:45.839Z',
  updatedBy: 'elastic',
  version: 1,
  ...params,
});
