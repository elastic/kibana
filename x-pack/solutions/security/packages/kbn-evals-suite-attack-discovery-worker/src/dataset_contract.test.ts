/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasWorld } from './worker_world';
import { AUDIT_SCENARIOS, getGoldForVariant } from './audit_failure_classes/registry';
import { buildWorkerRows, WORKER_SCENARIOS } from '../datasets/worker_rows';
import type { CohortRouting } from './cohort_routing';

const routing: CohortRouting = {
  cohort: 'review',
  generationModel: 'reference-model',
  reviewModel: 'model-under-test',
  runnerConnectorId: 'reference-model',
  features: [],
};

describe('worker dataset contract', () => {
  const rows = buildWorkerRows(routing);

  it('has one row per audit scenario and no row for an unknown one', () => {
    expect(rows.map(({ id }) => id).sort()).toEqual(AUDIT_SCENARIOS.map(({ id }) => id).sort());
  });

  it('has a unique id per row', () => {
    expect(new Set(rows.map(({ id }) => id)).size).toBe(rows.length);
  });

  it.each(WORKER_SCENARIOS.map((row) => [row.scenarioId, row] as const))(
    '%s agrees with its generation gold',
    (_id, { scenarioId, expected }) => {
      const scenario = AUDIT_SCENARIOS.find(({ id }) => id === scenarioId);
      expect(scenario).toBeDefined();
      expect(expected.expectedDiscoveries).toBe(
        getGoldForVariant(scenario!.gold, 'baseline').expectedDiscoveries
      );
    }
  );

  it.each(rows.map((row) => [row.id, row] as const))(
    '%s has a verdict that makes the row meaningful',
    (_id, row) => {
      const { goldVerdict, alsoAccepts = [] } = row.output!;
      expect(alsoAccepts).not.toContain(goldVerdict);
      // A false-positive row must not also accept true positive: that would pass anything.
      if (goldVerdict === 'false_positive') expect(alsoAccepts).toEqual([]);
    }
  );

  it('marks exactly the rows with no seeded world as blind', () => {
    for (const row of rows) {
      expect(Boolean(row.output!.blindReason)).toBe(!hasWorld(String(row.id)));
    }
  });

  it('stamps the cohort and both stage models on every row', () => {
    for (const row of rows) {
      expect(row.metadata).toMatchObject({
        cohort: 'review',
        generation_model: 'reference-model',
        review_model: 'model-under-test',
      });
    }
  });

  it('declares a rubric for each stage that can produce prose', () => {
    for (const { expected } of WORKER_SCENARIOS) {
      expect(expected.criteria.length).toBeGreaterThan(0);
      if (expected.expectedDiscoveries === 'atLeastOne') {
        expect(expected.generationCriteria.length).toBeGreaterThan(0);
      }
    }
  });
});
