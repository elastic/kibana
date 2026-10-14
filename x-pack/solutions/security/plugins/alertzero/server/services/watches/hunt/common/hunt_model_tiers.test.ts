/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { TIER2_MODEL_TIERS, describeModelTiers, unavailableModelTiers } from './hunt_model_tiers';

const model = {} as ScopedModel;

describe('unavailableModelTiers', () => {
  it('lists the tiers with no model, in tier order', () => {
    expect(unavailableModelTiers({ balanced: model })).toEqual(['efficient', 'frontier']);
  });

  it('is empty when every tier resolved', () => {
    expect(unavailableModelTiers({ efficient: model, balanced: model, frontier: model })).toEqual(
      []
    );
  });

  it('only considers the tiers it is asked about', () => {
    expect(unavailableModelTiers({ balanced: model }, TIER2_MODEL_TIERS)).toEqual(['frontier']);
  });
});

describe('describeModelTiers', () => {
  it.each([
    [['frontier'], 'Frontier tier'],
    [['balanced', 'frontier'], 'Balanced and Frontier tiers'],
    [['efficient', 'balanced', 'frontier'], 'Efficient, Balanced and Frontier tiers'],
  ] as const)('describes %j as "%s"', (tiers, expected) => {
    expect(describeModelTiers(tiers)).toBe(expected);
  });
});
