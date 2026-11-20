/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInventoryAlertGroupingField,
  getInventoryRuleSchema,
} from './get_inventory_rule_schema';

describe('getInventoryRuleSchema', () => {
  it('returns the stored schema unchanged', () => {
    expect(getInventoryRuleSchema('semconv')).toBe('semconv');
    expect(getInventoryRuleSchema('ecs')).toBe('ecs');
  });

  it('leaves an omitted schema omitted', () => {
    // Hosts parity: do not substitute DEFAULT_SCHEMA (semconv).
    expect(getInventoryRuleSchema(undefined)).toBeUndefined();
    expect(getInventoryRuleSchema(null)).toBeUndefined();
  });
});

describe('getInventoryAlertGroupingField', () => {
  it('groups a pod rule by its stored schema, defaulting to ecs identity when omitted', () => {
    expect(getInventoryAlertGroupingField('pod', 'semconv')).toBe('k8s.pod.uid');
    expect(getInventoryAlertGroupingField('pod', 'ecs')).toBe('kubernetes.pod.uid');
    expect(getInventoryAlertGroupingField('pod', undefined)).toBe('kubernetes.pod.uid');
    expect(getInventoryAlertGroupingField('pod', null)).toBe('kubernetes.pod.uid');
  });

  it('keeps host.name for a SemConv host rule', () => {
    expect(getInventoryAlertGroupingField('host', 'semconv')).toBe('host.name');
  });

  it('leaves AWS inventory types ungrouped', () => {
    expect(getInventoryAlertGroupingField('awsEC2', 'ecs')).toBeUndefined();
  });
});
