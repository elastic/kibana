/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import {
  getInventoryAlertGroupingField,
  getInventoryRuleSchema,
} from './get_inventory_rule_schema';

describe('getInventoryRuleSchema', () => {
  it('forces a pod rule to ecs for every stored schema when the selector is disabled', () => {
    expect(getInventoryRuleSchema('pod', 'semconv')).toBe('ecs');
    expect(getInventoryRuleSchema('pod', 'ecs')).toBe('ecs');
    expect(getInventoryRuleSchema('pod', undefined)).toBe('ecs');
    expect(getInventoryRuleSchema('pod', null)).toBe('ecs');
  });

  it('follows the stored pod schema when the selector is enabled, like every other node type', () => {
    expect(getInventoryRuleSchema('pod', 'semconv', true)).toBe('semconv');
    expect(getInventoryRuleSchema('pod', 'ecs', true)).toBe('ecs');
    // An omitted schema stays omitted, so the search is not narrowed to one schema.
    expect(getInventoryRuleSchema('pod', undefined, true)).toBeUndefined();
    expect(getInventoryRuleSchema('pod', null, true)).toBeUndefined();
  });

  it('keeps the pod coerce when the control is explicitly disabled', () => {
    expect(getInventoryRuleSchema('pod', 'semconv', false)).toBe('ecs');
  });

  it('ignores the pod flag for every other node type', () => {
    const nonPodNodeTypes: InventoryItemType[] = [
      'host',
      'container',
      'awsEC2',
      'awsS3',
      'awsSQS',
      'awsRDS',
    ];
    for (const nodeType of nonPodNodeTypes) {
      expect(getInventoryRuleSchema(nodeType, 'semconv', true)).toBe('semconv');
      expect(getInventoryRuleSchema(nodeType, 'ecs', true)).toBe('ecs');
    }
  });

  it('keeps a stored host schema', () => {
    expect(getInventoryRuleSchema('host', 'semconv')).toBe('semconv');
    expect(getInventoryRuleSchema('host', 'ecs')).toBe('ecs');
  });

  it('leaves a host rule that has no schema omitted', () => {
    expect(getInventoryRuleSchema('host', undefined)).toBeUndefined();
    expect(getInventoryRuleSchema('host', null)).toBeUndefined();
  });
});

describe('getInventoryAlertGroupingField', () => {
  it('groups a pod rule on the ecs field kubernetes.pod.uid for every stored schema when the selector is disabled', () => {
    expect(getInventoryAlertGroupingField('pod', 'semconv')).toBe('kubernetes.pod.uid');
    expect(getInventoryAlertGroupingField('pod', 'ecs')).toBe('kubernetes.pod.uid');
    expect(getInventoryAlertGroupingField('pod', undefined)).toBe('kubernetes.pod.uid');
  });

  it('groups a pod rule by its stored schema when the selector is enabled, defaulting to ecs', () => {
    expect(getInventoryAlertGroupingField('pod', 'semconv', true)).toBe('k8s.pod.uid');
    expect(getInventoryAlertGroupingField('pod', 'ecs', true)).toBe('kubernetes.pod.uid');
    expect(getInventoryAlertGroupingField('pod', undefined, true)).toBe('kubernetes.pod.uid');
    expect(getInventoryAlertGroupingField('pod', null, true)).toBe('kubernetes.pod.uid');
  });

  it('keeps host.name for a SemConv host rule', () => {
    expect(getInventoryAlertGroupingField('host', 'semconv')).toBe('host.name');
  });

  it('leaves AWS inventory types ungrouped', () => {
    expect(getInventoryAlertGroupingField('awsEC2', 'ecs')).toBeUndefined();
  });
});
