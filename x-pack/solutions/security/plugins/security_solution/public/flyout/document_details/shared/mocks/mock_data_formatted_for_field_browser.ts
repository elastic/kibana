/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

export const ruleTypeField: TimelineEventsDetailsItem = {
  category: 'kibana',
  field: 'kibana.alert.rule.type',
  values: ['query'],
  originalValue: ['query'],
  isObjectArray: false,
};

export const baseFields: TimelineEventsDetailsItem[] = [
  {
    category: 'agent',
    field: 'agent.id',
    values: ['agent.id'],
    originalValue: ['agent.id'],
    isObjectArray: false,
  },
  {
    category: '_id',
    field: '_id',
    values: ['_id'],
    originalValue: ['_id'],
    isObjectArray: false,
  },
  {
    category: 'base',
    field: '@timestamp',
    values: ['2023-01-01T01:01:01.000Z'],
    originalValue: ['2023-01-01T01:01:01.000Z'],
    isObjectArray: false,
  },
  {
    category: 'event',
    field: 'event.category',
    values: ['registry'],
    originalValue: ['registry'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.ancestors.id',
    values: ['ancestors-id'],
    originalValue: ['ancestors-id'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.rule.description',
    values: ['rule-description'],
    originalValue: ['rule-description'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.rule.indices',
    values: ['rule-indices'],
    originalValue: ['rule-indices'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.rule.name',
    values: ['rule-name'],
    originalValue: ['rule-name'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.rule.parameters.index',
    values: ['rule-parameters-index'],
    originalValue: ['rule-parameters-index'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.url',
    values: ['alert-url'],
    originalValue: ['alert-url'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.rule.uuid',
    values: ['rule-uuid'],
    originalValue: ['rule-uuid'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.workflow_status',
    values: ['open'],
    originalValue: ['open'],
    isObjectArray: false,
  },
  {
    category: 'process',
    field: 'process.entity_id',
    values: ['process-entity_id'],
    originalValue: ['process-entity_id'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.name',
    values: ['host-name'],
    originalValue: ['host-name'],
    isObjectArray: false,
  },
  {
    category: 'user',
    field: 'user.name',
    values: ['user-name'],
    originalValue: ['user-name'],
    isObjectArray: false,
  },
  {
    category: '_index',
    field: '_index',
    values: ['index'],
    originalValue: ['index'],
    isObjectArray: false,
  },
];

/**
 * Mock an array of fields for an alert
 */
export const mockDataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
  ruleTypeField,
  ...baseFields,
];

export const mockDataFormattedForFieldBrowserWithOverridenField = [
  { ...ruleTypeField, values: ['threshold'], originalValue: ['threshold'] },
  {
    category: 'base',
    field: 'kibana.alert.threshold_result.terms.field',
    values: ['original value'],
    isObjectArray: false,
  },
  {
    category: 'base',
    field: 'kibana.alert.threshold_result.terms.value',
    values: ['overriden value'],
    isObjectArray: false,
  },
  ...baseFields,
];
