/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvidenceRegistry } from './evidence_registry';

describe('EvidenceRegistry', () => {
  it('numbers entities in registration order and dedupes by euid', () => {
    const registry = new EvidenceRegistry();
    expect(registry.entity('host:a')).toBe('ENT-1');
    expect(registry.entity('user:b')).toBe('ENT-2');
    expect(registry.entity('host:a')).toBe('ENT-1');
    expect(registry.entityEuids()).toEqual(['host:a', 'user:b']);
  });

  it('keys tactics and gaps by id', () => {
    const registry = new EvidenceRegistry();
    expect(registry.tactic('TA0008')).toBe('TAC-TA0008');
    expect(registry.gap('B5')).toBe('GAP-B5');
    expect(registry.has('TAC-TA0008')).toBe(true);
    expect(registry.has('TAC-TA0001')).toBe(false);
  });

  it('dedupes rules by rule id', () => {
    const registry = new EvidenceRegistry();
    const rule = {
      kind: 'rule' as const,
      ruleId: 'r1',
      name: 'R1',
      severity: 'high' as const,
      alertCount: 1,
      tacticIds: [],
      techniqueIds: [],
    };
    expect(registry.rule(rule)).toBe('RULE-1');
    expect(registry.rule({ ...rule, alertCount: 2 })).toBe('RULE-1');
    expect(Object.keys(registry.toCatalog())).toEqual(['RULE-1']);
  });
});
