/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateScenario, safeValidateScenario } from './scenario_schema';
import type { Scenario } from './scenario_schema';

describe('ScenarioSchema', () => {
  const validScenario: Scenario = {
    id: 'test-scenario-1',
    name: 'Test Scenario',
    description: 'A test scenario for unit tests',
    techniqueIds: ['T1059.001'],
    host: { id: 'host-1', name: 'DESKTOP-TEST', os: 'windows' },
    user: { name: 'testuser' },
    rules: [{ ruleId: 'rule-1', expectedAlerts: 1 }],
    noise: { count: 20, spreadMs: 60000, includeRedHerrings: false },
    tags: ['test'],
    version: '1.0.0',
  };

  it('validates a correct scenario', () => {
    expect(() => validateScenario(validScenario)).not.toThrow();
  });

  it('fills in defaults for optional fields', () => {
    const minimal = {
      id: 'min-1',
      name: 'Minimal',
      description: 'Minimal scenario',
      techniqueIds: ['T1059.001'],
      host: { id: 'h', name: 'host' },
      user: { name: 'user' },
      rules: [{ ruleId: 'r1' }],
    };

    const result = validateScenario(minimal);
    expect(result.noise.count).toBe(20);
    expect(result.tags).toEqual([]);
    expect(result.version).toBe('1.0.0');
    expect(result.host.os).toBe('windows');
    expect(result.rules[0].expectedAlerts).toBe(1);
  });

  it('rejects scenario without rules', () => {
    const invalid = { ...validScenario, rules: [] };
    const result = safeValidateScenario(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects scenario without techniqueIds', () => {
    const invalid = { ...validScenario, techniqueIds: [] };
    const result = safeValidateScenario(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative noise count', () => {
    const invalid = { ...validScenario, noise: { count: -1 } };
    const result = safeValidateScenario(invalid);
    expect(result.success).toBe(false);
  });
});
