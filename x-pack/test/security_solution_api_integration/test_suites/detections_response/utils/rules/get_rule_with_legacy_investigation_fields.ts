/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleParamsWithDefaultValue } from '@kbn/response-ops-rule-params';
import { CreateRuleRequestBody } from '@kbn/alerting-plugin/common/routes/rule/apis/create';

const baseBody = {
  name: 'Test investigation fields',
  tags: ['migration'],
  rule_type_id: 'siem.queryRule',
  consumer: 'siem',
  schedule: {
    interval: '5m',
  },
  enabled: false,
  actions: [],
  throttle: null,
};

const baseParams: RuleParamsWithDefaultValue = {
  alertSuppression: undefined,
  author: [],
  buildingBlockType: undefined,
  dataViewId: undefined,
  description: 'a',
  exceptionsList: [],
  falsePositives: [],
  filters: [],
  from: '1900-01-01T00:00:00.000Z',
  immutable: false,
  index: ['auditbeat-*'],
  investigationFields: ['client.address', 'agent.name'],
  language: 'kuery',
  license: '',
  maxSignals: 100,
  meta: undefined,
  namespace: undefined,
  note: undefined,
  outputIndex: '',
  query: '_id:BhbXBmkBR346wHgn4PeZ or _id:GBbXBmkBR346wHgn5_eR or _id:x10zJ2oE9v5HJNSHhyxi',
  references: [],
  relatedIntegrations: [],
  requiredFields: undefined,
  responseActions: undefined,
  riskScore: 21,
  riskScoreMapping: [],
  ruleId: '2297be91-894c-4831-830f-b424a0ec84f0',
  ruleNameOverride: undefined,
  savedId: undefined,
  setup: '',
  severity: 'low',
  severityMapping: [],
  threat: [],
  timelineId: undefined,
  timelineTitle: undefined,
  timestampOverride: undefined,
  timestampOverrideFallbackDisabled: undefined,
  to: 'now',
  type: 'query',
  version: 1,
};

export const getRuleSavedObjectWithLegacyInvestigationFields = (
  rewrites?: Partial<CreateRuleRequestBody<RuleParamsWithDefaultValue>>
): CreateRuleRequestBody<RuleParamsWithDefaultValue> => ({
  ...baseBody,
  params: {
    ...baseParams,
    ...rewrites?.params,
  },
  ...rewrites,
});

export const getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray = (
  rewrites?: Partial<CreateRuleRequestBody<RuleParamsWithDefaultValue>>
): CreateRuleRequestBody<RuleParamsWithDefaultValue> => ({
  ...baseBody,
  name: 'Test investigation fields empty array',
  params: {
    ...baseParams,
    ruleId: 'rule-with-legacy-investigation-fields-empty-array',
    investigationFields: [],
    ...rewrites?.params,
  },
  ...rewrites,
});
