/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertRuleIdsToKQL, enrichFilterWithRuleIds } from './enrich_filter_with_rule_ids';

describe('convertRuleIdsToKQL', () => {
  it('should convert single rule id to KQL', () => {
    const result = convertRuleIdsToKQL(['123']);
    expect(result).toBe('alert.id: ("alert:123")');
  });

  it('should convert multiple rule ids to KQL with OR', () => {
    const result = convertRuleIdsToKQL(['123', '456']);
    expect(result).toBe('alert.id: ("alert:123") OR alert.id: ("alert:456")');
  });

  it('should handle empty array', () => {
    const result = convertRuleIdsToKQL([]);
    expect(result).toBe('');
  });
});

describe('enrichFilterWithRuleIds', () => {
  it('should return original filter when no rule ids provided', () => {
    const result = enrichFilterWithRuleIds('host.name: "test"');
    expect(result).toBe('host.name: "test"');
  });

  it('should return original filter when undefined rule ids provided', () => {
    const result = enrichFilterWithRuleIds('host.name: "test"', undefined);
    expect(result).toBe('host.name: "test"');
  });

  it('should return original filter when empty rule ids array provided', () => {
    const result = enrichFilterWithRuleIds('host.name: "test"', []);
    expect(result).toBe('host.name: "test"');
  });

  it('should return only rule ids KQL when no original filter', () => {
    const result = enrichFilterWithRuleIds(null, ['123']);
    expect(result).toBe('alert.id: ("alert:123")');
  });

  it('should return only rule ids KQL when empty original filter', () => {
    const result = enrichFilterWithRuleIds('', ['123']);
    expect(result).toBe('alert.id: ("alert:123")');
  });

  it('should combine original filter and rule ids with AND', () => {
    const result = enrichFilterWithRuleIds('host.name: "test"', ['123']);
    expect(result).toBe('(host.name: "test") AND (alert.id: ("alert:123"))');
  });

  it('should handle multiple rule ids', () => {
    const result = enrichFilterWithRuleIds('host.name: "test"', ['123', '456']);
    expect(result).toBe(
      '(host.name: "test") AND (alert.id: ("alert:123") OR alert.id: ("alert:456"))'
    );
  });

  it('should handle undefined original filter', () => {
    const result = enrichFilterWithRuleIds(undefined, ['123']);
    expect(result).toBe('alert.id: ("alert:123")');
  });
});
