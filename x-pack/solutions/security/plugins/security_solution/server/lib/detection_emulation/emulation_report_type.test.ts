/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { emulationReportType, emulationReportTypeName } from './emulation_report_type';

// ─── SO type metadata ─────────────────────────────────────────────────────────

describe('emulationReportType — metadata', () => {
  it('has the correct type name', () => {
    expect(emulationReportTypeName).toBe('detection-emulation-report');
    expect(emulationReportType.name).toBe('detection-emulation-report');
  });

  it('is hidden from the generic SO HTTP API surface', () => {
    expect(emulationReportType.hidden).toBe(true);
    expect(emulationReportType.hiddenFromHttpApis).toBe(true);
  });

  it('is namespace-scoped (multiple-isolated)', () => {
    expect(emulationReportType.namespaceType).toBe('multiple-isolated');
  });

  it('uses the security solution shared index', () => {
    expect(emulationReportType.indexPattern).toBe(SECURITY_SOLUTION_SAVED_OBJECT_INDEX);
  });
});

// ─── Mappings completeness ────────────────────────────────────────────────────

describe('emulationReportType — mappings', () => {
  const { properties } = emulationReportType.mappings;

  it('has dynamic: false at top level', () => {
    expect(emulationReportType.mappings.dynamic).toBe(false);
  });

  it.each([
    'scenarioId',
    'ruleId',
    'scenarioFingerprint',
    'mode',
    'endpointIds',
    'agentType',
    'startedAt',
    'completedAt',
    'payloadIds',
    'dispatchedActions',
    'score',
    'perPhase',
    'operator',
    'spaceId',
  ])('mappings contain field %s', (field) => {
    expect(properties).toHaveProperty(field);
  });

  it('score sub-fields include confidence, coverage, precision, tp, fp', () => {
    const scoreProps = (properties!.score as { properties: Record<string, unknown> }).properties;
    expect(scoreProps).toHaveProperty('confidence');
    expect(scoreProps).toHaveProperty('coverage');
    expect(scoreProps).toHaveProperty('precision');
    expect(scoreProps).toHaveProperty('tp');
    expect(scoreProps).toHaveProperty('fp');
  });

  it('dispatchedActions has dynamic: false', () => {
    expect((properties!.dispatchedActions as { dynamic: unknown }).dynamic).toBe(false);
  });

  it('perPhase has dynamic: false', () => {
    expect((properties!.perPhase as { dynamic: unknown }).dynamic).toBe(false);
  });

  it('date fields are mapped as date type', () => {
    expect((properties!.startedAt as { type: string }).type).toBe('date');
    expect((properties!.completedAt as { type: string }).type).toBe('date');
  });

  it('keyword fields are mapped as keyword type', () => {
    for (const field of [
      'scenarioId',
      'ruleId',
      'scenarioFingerprint',
      'mode',
      'agentType',
      'operator',
      'spaceId',
    ]) {
      expect((properties![field] as { type: string }).type).toBe('keyword');
    }
  });
});

// ─── modelVersions baseline ───────────────────────────────────────────────────

describe('emulationReportType — modelVersions', () => {
  it('has a baseline version 1', () => {
    expect(emulationReportType.modelVersions).toBeDefined();
    const versions = emulationReportType.modelVersions as Record<string, unknown>;
    expect(versions).toHaveProperty('1');
  });

  it('version 1 has forwardCompatibility and create schemas', () => {
    const versions = emulationReportType.modelVersions as Record<
      string,
      { schemas: { forwardCompatibility: unknown; create: unknown } }
    >;
    expect(versions['1'].schemas.forwardCompatibility).toBeDefined();
    expect(versions['1'].schemas.create).toBeDefined();
  });

  it('create schema accepts a valid EmulationReportAttributes object', () => {
    const versions = emulationReportType.modelVersions as Record<
      string,
      { schemas: { create: { validate: (v: unknown) => unknown } } }
    >;
    const valid = {
      scenarioId: 'sha256-abc',
      ruleId: 'rule-001',
      scenarioFingerprint: 'fp-xyz',
      mode: 'real_execution',
      endpointIds: ['ep-1'],
      agentType: 'endpoint',
      startedAt: '2024-01-01T00:00:00.000Z',
      payloadIds: ['T1059.001'],
      dispatchedActions: [{ actionId: 'act-1', command: 'execute', status: 'dispatched' }],
      score: { confidence: 0.8, coverage: 0.9, precision: 0.85, tp: 2, fp: 0 },
      perPhase: [
        { techniqueId: 'T1059.001', tp: 2, fp: 0, signals: ['Suspicious PowerShell Script'] },
      ],
      operator: 'analyst@elastic.co',
      spaceId: 'default',
    };
    expect(() => versions['1'].schemas.create.validate(valid)).not.toThrow();
  });

  it('create schema rejects an object missing required field scenarioId', () => {
    const versions = emulationReportType.modelVersions as Record<
      string,
      { schemas: { create: { validate: (v: unknown) => unknown } } }
    >;
    const invalid = { ruleId: 'rule-001' };
    expect(() => versions['1'].schemas.create.validate(invalid)).toThrow();
  });

  it('create schema rejects an invalid mode value', () => {
    const versions = emulationReportType.modelVersions as Record<
      string,
      { schemas: { create: { validate: (v: unknown) => unknown } } }
    >;
    const invalid = {
      scenarioId: 'sha256-abc',
      ruleId: 'rule-001',
      scenarioFingerprint: 'fp-xyz',
      mode: 'unsupported_mode',
      endpointIds: [],
      agentType: 'endpoint',
      startedAt: '2024-01-01T00:00:00.000Z',
      payloadIds: [],
      dispatchedActions: [],
      score: { confidence: 0, coverage: 0, precision: 0, tp: 0, fp: 0 },
      perPhase: [],
      operator: 'user',
      spaceId: 'default',
    };
    expect(() => versions['1'].schemas.create.validate(invalid)).toThrow();
  });

  it('forwardCompatibility schema ignores unknown fields', () => {
    const versions = emulationReportType.modelVersions as Record<
      string,
      { schemas: { forwardCompatibility: { validate: (v: unknown) => unknown } } }
    >;
    const withExtra = {
      scenarioId: 'sha256-abc',
      ruleId: 'rule-001',
      scenarioFingerprint: 'fp-xyz',
      mode: 'log_injection',
      endpointIds: [],
      agentType: 'endpoint',
      startedAt: '2024-01-01T00:00:00.000Z',
      payloadIds: [],
      dispatchedActions: [],
      score: { confidence: 0, coverage: 0, precision: 0, tp: 0, fp: 0 },
      perPhase: [],
      operator: 'user',
      spaceId: 'default',
      futureField: 'some-value-from-a-newer-version',
    };
    expect(() => versions['1'].schemas.forwardCompatibility.validate(withExtra)).not.toThrow();
  });
});
