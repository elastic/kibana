/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
} from './constants';
import { mergeFeatureOverride, type InferenceFeatureSetting } from './inference_override';

/**
 * Only the `whole` cohort is supported today: runs start through the floor worker, which passes
 * the runner no `connector_id`, so generation and review always resolve to the same feature
 * routing and cannot be given different models. Split cohorts (a pinned generation or review
 * model) become possible once the floor worker can pin the runner's `connector_id`; see the
 * README's future-work note.
 */
export const COHORTS = ['whole'] as const;
export type Cohort = (typeof COHORTS)[number];

export const parseCohort = (raw: string | undefined): Cohort => {
  const value = raw?.trim() || 'whole';
  const cohort = COHORTS.find((candidate) => candidate === value);
  if (!cohort) {
    throw new Error(
      `Unknown cohort "${value}"; only "whole" is supported (split cohorts need the floor worker to pin the runner's connector_id).`
    );
  }
  return cohort;
};

export interface CohortRouting {
  cohort: Cohort;
  /** Inference endpoint that generation resolves to. */
  generationModel: string;
  /** Inference endpoint that the review's FP/TP analysis resolves to. */
  reviewModel: string;
  /** The full inference settings document to write. */
  features: InferenceFeatureSetting[];
}

const firstEndpoint = (
  features: readonly InferenceFeatureSetting[],
  featureId: string
): string | undefined => features.find(({ feature_id: id }) => id === featureId)?.endpoints[0]?.id;

/**
 * Resolves each stage the way the workflows do: both use the first mapped feature of
 * `alertzero_template_models`, then `alertzero_frontier`, and neither has a `connector_id`
 * override in the `whole` cohort.
 */
export const resolveStageModels = ({
  features,
}: {
  features: readonly InferenceFeatureSetting[];
}): { generation: string | undefined; review: string | undefined } => {
  const byFeature =
    firstEndpoint(features, ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID) ??
    firstEndpoint(features, ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID);
  return { generation: byFeature, review: byFeature };
};

/**
 * Plans the `whole`-cohort routing and checks it: both stages resolve to the model under test,
 * whatever the space mapped before. `alertzero_template_models` outranks `alertzero_frontier`
 * for both stages, so when the space maps it, it is pointed at the same endpoint as the
 * frontier feature.
 */
export const planCohortRouting = ({
  modelUnderTest,
  features,
}: {
  modelUnderTest: string;
  features: readonly InferenceFeatureSetting[];
}): CohortRouting => {
  const withFrontier = mergeFeatureOverride(
    features,
    ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
    modelUnderTest
  );
  const planned =
    firstEndpoint(features, ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID) === undefined
      ? withFrontier
      : mergeFeatureOverride(withFrontier, ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID, modelUnderTest);

  const resolved = resolveStageModels({ features: planned });
  if (resolved.generation !== modelUnderTest || resolved.review !== modelUnderTest) {
    throw new Error(
      `Cohort "whole" routing does not reach the model under test: generation resolves to ${resolved.generation}, review to ${resolved.review}; expected ${modelUnderTest} for both.`
    );
  }
  return {
    cohort: 'whole',
    generationModel: modelUnderTest,
    reviewModel: modelUnderTest,
    features: planned,
  };
};
