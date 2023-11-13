/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InternalRuleCreate } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';

export const getRuleSavedObjectWithLegacyInvestigationFields = (): InternalRuleCreate =>
  ({
    name: 'Test investigation fields',
    tags: ['migration'],
    rule_type_id: 'siem.queryRule',
    consumer: 'siem',
    params: {
      author: [],
      buildingBlockType: undefined,
      falsePositives: [],
      description: 'a',
      ruleId: '2297be91-894c-4831-830f-b424a0ec84f0',
      from: '1900-01-01T00:00:00.000Z',
      immutable: false,
      license: '',
      outputIndex: '',
      investigationFields: ['client.address', 'agent.name'],
      maxSignals: 100,
      meta: undefined,
      riskScore: 21,
      riskScoreMapping: [],
      severity: 'low',
      severityMapping: [],
      threat: [],
      to: 'now',
      references: [],
      timelineId: undefined,
      timelineTitle: undefined,
      ruleNameOverride: undefined,
      timestampOverride: undefined,
      timestampOverrideFallbackDisabled: undefined,
      namespace: undefined,
      note: undefined,
      requiredFields: undefined,
      version: 1,
      exceptionsList: [],
      relatedIntegrations: [],
      setup: '',
      type: 'query',
      language: 'kuery',
      index: ['auditbeat-*'],
      query: '_id:BhbXBmkBR346wHgn4PeZ or _id:GBbXBmkBR346wHgn5_eR or _id:x10zJ2oE9v5HJNSHhyxi',
      filters: [],
      savedId: undefined,
      responseActions: undefined,
      alertSuppression: undefined,
      dataViewId: undefined,
    },
    schedule: {
      interval: '5m',
    },
    enabled: false,
    actions: [],
    throttle: null,
    // cast is due to alerting API expecting rule_type_id
    // and our internal schema expecting alertTypeId
  } as unknown as InternalRuleCreate);

export const getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray = (): InternalRuleCreate =>
  ({
    name: 'Test investigation fields empty array',
    tags: ['migration'],
    rule_type_id: 'siem.queryRule',
    consumer: 'siem',
    params: {
      author: [],
      description: 'a',
      ruleId: '2297be91-894c-4831-830f-b424a0ec5678',
      falsePositives: [],
      from: '1900-01-01T00:00:00.000Z',
      immutable: false,
      license: '',
      outputIndex: '',
      investigationFields: [],
      maxSignals: 100,
      riskScore: 21,
      riskScoreMapping: [],
      severity: 'low',
      severityMapping: [],
      threat: [],
      to: 'now',
      references: [],
      version: 1,
      exceptionsList: [],
      type: 'query',
      language: 'kuery',
      index: ['auditbeat-*'],
      query: '_id:BhbXBmkBR346wHgn4PeZ or _id:GBbXBmkBR346wHgn5_eR or _id:x10zJ2oE9v5HJNSHhyxi',
      filters: [],
      relatedIntegrations: [],
      setup: '',
      buildingBlockType: undefined,
      meta: undefined,
      timelineId: undefined,
      timelineTitle: undefined,
      ruleNameOverride: undefined,
      timestampOverride: undefined,
      timestampOverrideFallbackDisabled: undefined,
      namespace: undefined,
      note: undefined,
      requiredFields: undefined,
      savedId: undefined,
      responseActions: undefined,
      alertSuppression: undefined,
      dataViewId: undefined,
    },
    schedule: {
      interval: '5m',
    },
    enabled: false,
    actions: [],
    throttle: null,
    // cast is due to alerting API expecting rule_type_id
    // and our internal schema expecting alertTypeId
  } as unknown as InternalRuleCreate);
