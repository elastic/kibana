/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PHASE_CATALOG,
  PHASE_CATALOG_GATES,
  PHASE_CATALOG_STEPS,
  PHASE_IDS,
  PHASE_LIVENESS,
} from '.';

describe('PHASE_CATALOG_STEPS', () => {
  it('has exactly twelve lifecycle steps', () => {
    expect(PHASE_CATALOG_STEPS).toHaveLength(12);
  });

  it('assigns every step a known phase', () => {
    PHASE_CATALOG_STEPS.forEach((step) => {
      expect(PHASE_IDS).toContain(step.phase);
    });
  });

  it('marks exactly ten steps live', () => {
    expect(PHASE_CATALOG_STEPS.filter((step) => step.liveness === 'live')).toHaveLength(10);
  });

  it('marks the ten expected steps live', () => {
    expect(
      PHASE_CATALOG_STEPS.filter((step) => step.liveness === 'live').map((step) => step.id)
    ).toEqual([
      'step-1-1',
      'step-2-1',
      'step-2-6',
      'step-2-7',
      'step-3-2',
      'step-3-5',
      'step-3-6',
      'step-4-2',
      'step-4-3',
      'step-4-4',
    ]);
  });

  it('marks exactly the two Attack Discovery steps upstream', () => {
    expect(
      PHASE_CATALOG_STEPS.filter((step) => step.liveness === 'upstream').map((step) => step.id)
    ).toEqual(['step-1-2', 'step-1-3']);
  });
});

describe('PHASE_CATALOG_GATES', () => {
  it('has exactly four phase-gate rows', () => {
    expect(PHASE_CATALOG_GATES).toHaveLength(4);
  });

  it('marks every gate row live', () => {
    PHASE_CATALOG_GATES.forEach((gate) => {
      expect(gate.liveness).toBe('live');
    });
  });
});

describe('PHASE_CATALOG', () => {
  it('gives every live entry an orchestratorStepId', () => {
    PHASE_CATALOG.filter((entry) => entry.liveness === 'live').forEach((entry) => {
      expect(entry.orchestratorStepId).toBeDefined();
    });
  });

  it('never gives an upstream entry an orchestratorStepId', () => {
    PHASE_CATALOG.filter((entry) => entry.liveness !== 'live').forEach((entry) => {
      expect(entry.orchestratorStepId).toBeUndefined();
    });
  });

  it('has unique entry ids', () => {
    const ids = PHASE_CATALOG.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('combines the twelve steps and 4 gate rows', () => {
    expect(PHASE_CATALOG).toHaveLength(16);
  });
});

/**
 * kibana-phf4.12 retired the lifecycle stub and, with it, the twelve `not_in_slice` rows nothing
 * performed. Every remaining row is realized by something observable — either a thin-slice
 * orchestrator step (`live`) or Attack Discovery / existing Elastic Security detections
 * (`upstream`) — so a reader can no longer mistake a catalog row for a promise the product does
 * not keep.
 */
describe('PHASE_CATALOG liveness (kibana-phf4.12)', () => {
  it('offers only live and upstream as liveness values', () => {
    expect(PHASE_LIVENESS).toEqual(['live', 'upstream']);
  });

  it('marks every row live or upstream', () => {
    PHASE_CATALOG.forEach((entry) => {
      expect(PHASE_LIVENESS).toContain(entry.liveness);
    });
  });

  it('has no row that nothing performs', () => {
    expect(
      PHASE_CATALOG.filter((entry) => entry.liveness !== 'live' && entry.liveness !== 'upstream')
    ).toEqual([]);
  });
});
