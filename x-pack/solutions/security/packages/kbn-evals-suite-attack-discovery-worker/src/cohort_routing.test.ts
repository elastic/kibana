/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID as FRONTIER,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID as TEMPLATE,
} from './constants';
import { parseCohort, planCohortRouting, resolveStageModels } from './cohort_routing';
import type { InferenceFeatureSetting } from './inference_override';

const MUT = 'model-under-test';
const feature = (id: string, endpoint: string): InferenceFeatureSetting => ({
  feature_id: id,
  endpoints: [{ id: endpoint }],
});

const SPACES: Array<[string, InferenceFeatureSetting[]]> = [
  ['empty settings', []],
  ['frontier mapped elsewhere', [feature(FRONTIER, 'stale')]],
  ['template models mapped elsewhere', [feature(FRONTIER, 'stale'), feature(TEMPLATE, 'other')]],
  ['unrelated feature kept', [feature('other_feature', 'keep-me')]],
];

describe('parseCohort', () => {
  it('defaults to whole and rejects split cohorts as unsupported', () => {
    expect(parseCohort(undefined)).toBe('whole');
    expect(parseCohort(' whole ')).toBe('whole');
    expect(() => parseCohort('review')).toThrow(/only "whole" is supported/);
    expect(() => parseCohort('generation')).toThrow(/only "whole" is supported/);
  });
});

describe('planCohortRouting', () => {
  describe.each(SPACES)('with %s', (_name, features) => {
    it('whole: both stages run the model under test', () => {
      const plan = planCohortRouting({ modelUnderTest: MUT, features });
      expect(resolveStageModels(plan)).toEqual({ generation: MUT, review: MUT });
      expect(plan).toMatchObject({
        cohort: 'whole',
        generationModel: MUT,
        reviewModel: MUT,
      });
    });

    it('keeps unrelated features', () => {
      const plan = planCohortRouting({ modelUnderTest: MUT, features });
      for (const kept of features.filter(
        ({ feature_id: id }) => id !== FRONTIER && id !== TEMPLATE
      )) {
        expect(plan.features).toContainEqual(kept);
      }
    });
  });

  it('negative control: routing only the frontier feature leaks through template models', () => {
    const stale = [feature(FRONTIER, MUT), feature(TEMPLATE, 'other')];
    expect(resolveStageModels({ features: stale })).toEqual({
      generation: 'other',
      review: 'other',
    });
  });

  it('does not map template models when the space had none', () => {
    const plan = planCohortRouting({ modelUnderTest: MUT, features: [] });
    expect(plan.features.map(({ feature_id: id }) => id)).toEqual([FRONTIER]);
  });
});
