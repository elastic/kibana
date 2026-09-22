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
  it('forces a pod rule to ecs for every stored schema', () => {
    expect(getInventoryRuleSchema('pod', 'semconv')).toBe('ecs');
    expect(getInventoryRuleSchema('pod', 'ecs')).toBe('ecs');
    expect(getInventoryRuleSchema('pod', undefined)).toBe('ecs');
    expect(getInventoryRuleSchema('pod', null)).toBe('ecs');
  });

  it('keeps a host schema, including an omission', () => {
    expect(getInventoryRuleSchema('host', 'semconv')).toBe('semconv');
    expect(getInventoryRuleSchema('host', 'ecs')).toBe('ecs');
    expect(getInventoryRuleSchema('host', undefined)).toBeUndefined();
    expect(getInventoryRuleSchema('host', null)).toBeUndefined();
  });
});

describe('getInventoryAlertGroupingField', () => {
  it('groups a stored semconv pod rule on kubernetes.pod.uid', () => {
    // Same ecs coerce as rule evaluation. Becomes k8s.pod.uid when that pod branch is removed.
    expect(getInventoryAlertGroupingField('pod', 'semconv')).toBe('kubernetes.pod.uid');
    expect(getInventoryAlertGroupingField('pod', undefined)).toBe('kubernetes.pod.uid');
  });

  it('keeps host.name for a SemConv host rule', () => {
    expect(getInventoryAlertGroupingField('host', 'semconv')).toBe('host.name');
  });

  it('leaves AWS inventory types ungrouped', () => {
    expect(getInventoryAlertGroupingField('awsEC2', 'ecs')).toBeUndefined();
  });
});
