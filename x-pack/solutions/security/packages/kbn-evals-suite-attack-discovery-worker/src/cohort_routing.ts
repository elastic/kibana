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
 * Which stage runs the model under test:
 * - `whole`: generation and review both run it.
 * - `generation`: generation runs it; review runs the fixed reference model.
 * - `review`: review runs it; generation runs the fixed reference model.
 */
export const COHORTS = ['whole', 'generation', 'review'] as const;
export type Cohort = (typeof COHORTS)[number];

export const parseCohort = (raw: string | undefined): Cohort => {
  const value = raw?.trim() || 'whole';
  const cohort = COHORTS.find((candidate) => candidate === value);
  if (!cohort) {
    throw new Error(`Unknown cohort "${value}"; expected one of ${COHORTS.join(', ')}.`);
  }
  return cohort;
};

export interface CohortRouting {
  cohort: Cohort;
  /** Inference endpoint that generation resolves to. */
  generationModel: string;
  /** Inference endpoint that the review's FP/TP analysis resolves to. */
  reviewModel: string;
  /** Runner input `connector_id`; unset when generation follows the feature routing. */
  runnerConnectorId?: string;
  /** The full inference settings document to write. */
  features: InferenceFeatureSetting[];
}

const firstEndpoint = (
  features: readonly InferenceFeatureSetting[],
  featureId: string
): string | undefined => features.find(({ feature_id: id }) => id === featureId)?.endpoints[0]?.id;

/**
 * Resolves each stage the way the workflows do. Generation uses the runner's `connector_id`
 * when set, otherwise the first mapped feature of `alertzero_template_models`, then
 * `alertzero_frontier`. The review's analysis step uses that same feature order and has no
 * `connector_id` override.
 */
export const resolveStageModels = ({
  features,
  runnerConnectorId,
}: {
  features: readonly InferenceFeatureSetting[];
  runnerConnectorId?: string;
}): { generation: string | undefined; review: string | undefined } => {
  const byFeature =
    firstEndpoint(features, ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID) ??
    firstEndpoint(features, ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID);
  return { generation: runnerConnectorId ?? byFeature, review: byFeature };
};

/**
 * Plans the routing for one cohort and checks it: each stage resolves to the model it should,
 * whatever the space mapped before. `alertzero_template_models` outranks `alertzero_frontier`
 * for both stages, so when the space maps it, it is pointed at the same endpoint as the
 * frontier feature.
 */
export const planCohortRouting = ({
  cohort,
  modelUnderTest,
  referenceModel,
  features,
}: {
  cohort: Cohort;
  modelUnderTest: string;
  referenceModel?: string;
  features: readonly InferenceFeatureSetting[];
}): CohortRouting => {
  if (cohort !== 'whole') {
    if (!referenceModel) {
      throw new Error(`The "${cohort}" cohort needs a reference model for the other stage.`);
    }
    if (referenceModel === modelUnderTest) {
      throw new Error(
        `The reference model equals the model under test (${modelUnderTest}); the "${cohort}" cohort would isolate nothing.`
      );
    }
  }
  const reference = referenceModel ?? modelUnderTest;
  const runnerConnectorId =
    cohort === 'generation' ? modelUnderTest : cohort === 'review' ? reference : undefined;
  const featureTarget = cohort === 'generation' ? reference : modelUnderTest;

  const withFrontier = mergeFeatureOverride(
    features,
    ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
    featureTarget
  );
  const planned =
    firstEndpoint(features, ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID) === undefined
      ? withFrontier
      : mergeFeatureOverride(withFrontier, ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID, featureTarget);

  const expected = {
    generation: cohort === 'review' ? reference : modelUnderTest,
    review: cohort === 'generation' ? reference : modelUnderTest,
  };
  const resolved = resolveStageModels({ features: planned, runnerConnectorId });
  if (resolved.generation !== expected.generation || resolved.review !== expected.review) {
    throw new Error(
      `Cohort "${cohort}" routing does not isolate the stages: generation resolves to ${resolved.generation}, review to ${resolved.review}; expected ${expected.generation} and ${expected.review}.`
    );
  }
  return {
    cohort,
    generationModel: expected.generation,
    reviewModel: expected.review,
    ...(runnerConnectorId ? { runnerConnectorId } : {}),
    features: planned,
  };
};
