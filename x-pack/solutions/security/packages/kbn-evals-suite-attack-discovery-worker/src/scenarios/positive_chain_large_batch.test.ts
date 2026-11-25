/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { positiveChainWithNoiseScenario } from '@kbn/evals-suite-attack-discovery';
import {
  LARGE_BATCH_MAX_ALERTS,
  LARGE_BATCH_SIZE,
  positiveChainLargeBatchScenario,
} from './positive_chain_large_batch';

const chainFieldsOf = (scenario: typeof positiveChainLargeBatchScenario) => {
  const { alertGroups, requiredGroup } = scenario.gold;
  const ids = new Set(requiredGroup ? alertGroups[requiredGroup] : []);
  return scenario.alerts.filter(({ id }) => ids.has(id)).map(({ fields }) => fields);
};

describe('positiveChainLargeBatchScenario', () => {
  const { alerts, gold } = positiveChainLargeBatchScenario;

  it('seeds at least 100 alerts, which is at least two generation batches', () => {
    expect(alerts.length).toBeGreaterThanOrEqual(100);
    expect(Math.ceil(alerts.length / LARGE_BATCH_SIZE)).toBeGreaterThanOrEqual(2);
    expect(LARGE_BATCH_MAX_ALERTS).toBeGreaterThanOrEqual(alerts.length);
  });

  it('gives every alert a distinct id', () => {
    expect(new Set(alerts.map(({ id }) => id)).size).toBe(alerts.length);
  });

  it('puts every alert in exactly one gold group', () => {
    const grouped = Object.values(gold.alertGroups).flat();
    expect([...grouped].sort()).toEqual(alerts.map(({ id }) => id).sort());
  });

  it('keeps the chain of positive-chain-with-noise, with the same gold expectations', () => {
    expect(chainFieldsOf(positiveChainLargeBatchScenario)).toEqual(
      chainFieldsOf(positiveChainWithNoiseScenario)
    );
    expect(gold.expectedDiscoveries).toBe(positiveChainWithNoiseScenario.gold.expectedDiscoveries);
    expect(gold.requiredGroup).toBe(positiveChainWithNoiseScenario.gold.requiredGroup);
  });

  it('forbids citing the chain together with any noise group', () => {
    const noiseGroups = Object.keys(gold.alertGroups).filter(
      (group) => group !== gold.requiredGroup
    );
    expect(noiseGroups.length).toBeGreaterThan(0);
    expect(gold.forbiddenCoCitation).toEqual(
      expect.arrayContaining(noiseGroups.map((group) => [gold.requiredGroup, group]))
    );
  });
});
