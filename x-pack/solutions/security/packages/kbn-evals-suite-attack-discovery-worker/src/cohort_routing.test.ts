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
import { COHORTS, parseCohort, planCohortRouting, resolveStageModels } from './cohort_routing';
import type { InferenceFeatureSetting } from './inference_override';

const MUT = 'model-under-test';
const REF = 'reference-model';
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
  it('defaults to whole and rejects unknown values', () => {
    expect(parseCohort(undefined)).toBe('whole');
    expect(parseCohort(' review ')).toBe('review');
    expect(() => parseCohort('both')).toThrow(/Unknown cohort/);
  });
});

describe('planCohortRouting', () => {
  describe.each(SPACES)('with %s', (_name, features) => {
    it('whole: both stages run the model under test and no connector is passed', () => {
      const plan = planCohortRouting({ cohort: 'whole', modelUnderTest: MUT, features });
      expect(plan.runnerConnectorId).toBeUndefined();
      expect(resolveStageModels(plan)).toEqual({ generation: MUT, review: MUT });
      expect(plan).toMatchObject({ generationModel: MUT, reviewModel: MUT });
    });

    it('generation: only generation runs the model under test', () => {
      const plan = planCohortRouting({
        cohort: 'generation',
        modelUnderTest: MUT,
        referenceModel: REF,
        features,
      });
      expect(plan.runnerConnectorId).toBe(MUT);
      expect(resolveStageModels(plan)).toEqual({ generation: MUT, review: REF });
      expect(plan).toMatchObject({ generationModel: MUT, reviewModel: REF });
    });

    it('review: only the review runs the model under test', () => {
      const plan = planCohortRouting({
        cohort: 'review',
        modelUnderTest: MUT,
        referenceModel: REF,
        features,
      });
      expect(plan.runnerConnectorId).toBe(REF);
      expect(resolveStageModels(plan)).toEqual({ generation: REF, review: MUT });
      expect(plan).toMatchObject({ generationModel: REF, reviewModel: MUT });
    });

    it('keeps unrelated features', () => {
      const plan = planCohortRouting({ cohort: 'whole', modelUnderTest: MUT, features });
      for (const kept of features.filter(
        ({ feature_id: id }) => id !== FRONTIER && id !== TEMPLATE
      )) {
        expect(plan.features).toContainEqual(kept);
      }
    });
  });

  it('negative control: routing only the frontier feature leaks through template models', () => {
    const stale = [feature(FRONTIER, MUT), feature(TEMPLATE, 'other')];
    expect(resolveStageModels({ features: stale, runnerConnectorId: REF })).toEqual({
      generation: REF,
      review: 'other',
    });
  });

  it('does not map template models when the space had none', () => {
    const plan = planCohortRouting({ cohort: 'whole', modelUnderTest: MUT, features: [] });
    expect(plan.features.map(({ feature_id: id }) => id)).toEqual([FRONTIER]);
  });

  it('needs a distinct reference model for single-stage cohorts', () => {
    for (const cohort of COHORTS.filter((c) => c !== 'whole')) {
      expect(() => planCohortRouting({ cohort, modelUnderTest: MUT, features: [] })).toThrow(
        /reference model/
      );
      expect(() =>
        planCohortRouting({ cohort, modelUnderTest: MUT, referenceModel: MUT, features: [] })
      ).toThrow(/isolate nothing/);
    }
  });
});
