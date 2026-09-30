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
  it('follows the stored pod schema like every other node type', () => {
    expect(getInventoryRuleSchema('pod', 'semconv')).toBe('semconv');
    expect(getInventoryRuleSchema('pod', 'ecs')).toBe('ecs');
    // An omitted schema stays omitted, so the search is not narrowed to one schema.
    expect(getInventoryRuleSchema('pod', undefined)).toBeUndefined();
    expect(getInventoryRuleSchema('pod', null)).toBeUndefined();
  });

  it('keeps a stored schema for every node type', () => {
    const nodeTypes: InventoryItemType[] = [
      'host',
      'pod',
      'container',
      'awsEC2',
      'awsS3',
      'awsSQS',
      'awsRDS',
    ];
    for (const nodeType of nodeTypes) {
      expect(getInventoryRuleSchema(nodeType, 'semconv')).toBe('semconv');
      expect(getInventoryRuleSchema(nodeType, 'ecs')).toBe('ecs');
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
  it('groups a pod rule by its stored schema, defaulting to ecs when omitted', () => {
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
