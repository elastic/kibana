/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import { NIGHTSHIFT_DEFAULT_MODELS } from '@kbn/significant-events-schema';

/** Inference feature the Nightshift agents run on when a turn does not pick a model. */
export const NIGHTSHIFT_INVESTIGATION_INFERENCE_FEATURE_ID = 'nightshift_investigation';

/**
 * Registers the hidden Nightshift investigation feature so Slack and chat follow-up turns run on
 * the same code-owned model as workflow-started investigations.
 */
export const registerNightshiftInferenceFeature = (
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup | undefined,
  logger: Logger
): void => {
  if (!searchInferenceEndpoints) {
    logger.debug(
      'searchInferenceEndpoints plugin not available, skipping Nightshift inference feature registration'
    );
    return;
  }

  const result = searchInferenceEndpoints.features.register({
    featureId: NIGHTSHIFT_INVESTIGATION_INFERENCE_FEATURE_ID,
    featureName: i18n.translate('xpack.nightshiftInvestigations.inferenceFeature.name', {
      defaultMessage: 'Nightshift investigations',
    }),
    featureDescription: i18n.translate(
      'xpack.nightshiftInvestigations.inferenceFeature.description',
      { defaultMessage: 'Model used by the Nightshift investigator and assistant agents.' }
    ),
    taskType: 'chat_completion',
    recommendedEndpoints: [NIGHTSHIFT_DEFAULT_MODELS.investigation],
    hidden: true,
  });

  if (!result.ok) {
    logger.warn(
      `Failed to register inference feature "${NIGHTSHIFT_INVESTIGATION_INFERENCE_FEATURE_ID}": ${result.error}`
    );
  }
};
