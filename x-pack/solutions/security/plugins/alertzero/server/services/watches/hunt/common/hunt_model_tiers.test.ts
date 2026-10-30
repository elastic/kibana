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
    expect(unavailableModelTiers({ frontier: model })).toEqual(['efficient']);
  });

  it('is empty when every tier resolved', () => {
    expect(unavailableModelTiers({ efficient: model, balanced: model, frontier: model })).toEqual(
      []
    );
  });

  it('only considers the tiers it is asked about', () => {
    expect(unavailableModelTiers({ efficient: model }, TIER2_MODEL_TIERS)).toEqual(['frontier']);
    expect(unavailableModelTiers({ frontier: model }, TIER2_MODEL_TIERS)).toEqual([]);
  });

  it('never asks about the balanced tier, which no hunt consumer runs on', () => {
    expect(unavailableModelTiers({ efficient: model, frontier: model })).toEqual([]);
  });

  it('does not list Efficient when a cyber model covers its consumers', () => {
    const cyber = {
      connector: { connectorId: 'daybreak', metadata: {} },
    } as ScopedModel;
    expect(unavailableModelTiers({ frontier: model, cyber })).toEqual([]);
  });

  it('does not list Frontier when a messages-capable cyber model covers both of its jobs', () => {
    const cyber = {
      connector: { connectorId: 'daybreak', metadata: {} },
    } as ScopedModel;
    expect(unavailableModelTiers({ cyber })).toEqual([]);
  });

  it('still lists Frontier when a template-required cyber model cannot run ES|QL generation', () => {
    const cyber = {
      connector: {
        connectorId: 'daybreak',
        metadata: { capabilities: { templates: { policy: 'required' } } },
      },
    } as ScopedModel;
    expect(unavailableModelTiers({ cyber })).toEqual(['frontier']);
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

  it('is empty for no tiers, never the string "undefined tier"', () => {
    expect(describeModelTiers([])).toBe('');
  });
});
