/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import {
  ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID,
  ALERTZERO_FAST_INFERENCE_FEATURE_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';

/**
 * Every endpoint below is a literal. `defaultInferenceEndpoints` stops at Claude 4.6 and GPT-5.4,
 * so no current-generation endpoint has a constant, and a constant would not prove the endpoint is
 * provisioned anyway. GA dates track `AGENT_BUILDER_RECOMMENDED_ENDPOINTS`, the list kept closest
 * to what EIS actually serves.
 *
 * Order is the fallback chain: a tier that loses its primary degrades to a still-current model on
 * the same rung rather than collapsing onto the cluster default.
 */

// The fast tier takes the highest-volume and lowest-stakes calls we make — one per alert — so a
// small model keeps the bill and the wall clock down. Same pairing Agent Builder uses for its fast
// tier. Sonnet sits last so this degrades to a mid-tier model, never up to a frontier one: a
// frontier recommendation here would silently bill the per-alert path at frontier rates.
const FAST_RECOMMENDED_ENDPOINTS = [
  '.google-gemini-3.5-flash-lite-chat_completion', // Gemini 3.5 Flash Lite, GA 2026-07-21
  '.anthropic-claude-4.5-haiku-chat_completion', // Claude Haiku 4.5, GA 2025-10-01
  '.anthropic-claude-5-sonnet-chat_completion', // Claude Sonnet 5, GA 2026-07-03
];

// Attack Discovery reads a whole batch of alerts and rule creation drafts an ES|QL rule from a gap
// description, both single-shot and both judged on the quality of one output, so they get the
// frontier model.
const REASONING_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-5-opus-chat_completion', // Claude Opus 5, GA 2026-07-24
  '.anthropic-claude-5-sonnet-chat_completion', // Claude Sonnet 5, GA 2026-07-03
  '.openai-gpt-5.6-sol-chat_completion', // GPT-5.6 Sol, GA 2026-07-09
];

// Agentic work favours a strong mid-tier rather than the frontier model: a rule diagnosis runs
// many tool rounds, and frontier latency and cost multiply by the round count.
const AGENTIC_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-5-sonnet-chat_completion', // Claude Sonnet 5, GA 2026-07-03
  '.openai-gpt-5.6-sol-chat_completion', // GPT-5.6 Sol, GA 2026-07-09
  '.anthropic-claude-5-opus-chat_completion', // Claude Opus 5, GA 2026-07-24
];

/**
 * Registers the AlertZero parent and one child per tier so operators pick each model in Stack
 * Management > Model Settings. No-op when the optional `searchInferenceEndpoints` plugin is
 * unavailable.
 *
 * Call this after the `config.enabled` guard: registration is boot-time and the registry is not
 * space-filtered, so the section exists in every space once AlertZero is on and does not exist at
 * all when it is off. `visibilityCondition` cannot express that — it keys off a uiSetting, not
 * plugin config.
 */
export const registerAlertZeroInferenceFeatures = (
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup | undefined,
  logger: Logger
): void => {
  if (!searchInferenceEndpoints) {
    logger.debug(
      'searchInferenceEndpoints plugin not available, skipping AlertZero inference feature registration'
    );
    return;
  }

  const { register } = searchInferenceEndpoints.features;

  // The parent is the section header in the UI and the last rung of the resolution chain, so it
  // recommends nothing of its own: a list here would become the silent default for any tier whose
  // own recommendations were cleared.
  const parentResult = register({
    featureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
    featureName: i18n.translate('xpack.alertzero.inferenceFeature.parentName', {
      defaultMessage: 'AlertZero',
    }),
    featureDescription: i18n.translate('xpack.alertzero.inferenceFeature.parentDescription', {
      defaultMessage: 'AI models used by AlertZero Workers, grouped by the kind of call they make.',
    }),
    taskType: 'chat_completion',
    recommendedEndpoints: [],
    isTechPreview: true,
  });

  if (!parentResult.ok) {
    logger.warn(
      `Failed to register inference feature "${ALERTZERO_INFERENCE_PARENT_FEATURE_ID}": ${parentResult.error}`
    );
  }

  // Registration order is render order: the registry is a Map and the UI lists what it returns, so
  // the rows read cheapest to most expensive.
  const tiers = [
    {
      featureId: ALERTZERO_FAST_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.alertzero.inferenceFeature.fastName', {
        defaultMessage: 'Fast models',
      }),
      featureDescription: i18n.translate('xpack.alertzero.inferenceFeature.fastDescription', {
        defaultMessage:
          'Low latency, high volume, and lightweight judgment, such as triaging an alert or checking detection coverage.',
      }),
      recommendedEndpoints: FAST_RECOMMENDED_ENDPOINTS,
    },
    {
      featureId: ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.alertzero.inferenceFeature.reasoningName', {
        defaultMessage: 'Reasoning models',
      }),
      featureDescription: i18n.translate('xpack.alertzero.inferenceFeature.reasoningDescription', {
        defaultMessage:
          'Deeper thinking for a complex, self-contained task answered in one shot, such as generating attack discoveries or drafting a detection rule.',
      }),
      recommendedEndpoints: REASONING_RECOMMENDED_ENDPOINTS,
    },
    {
      featureId: ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.alertzero.inferenceFeature.agenticName', {
        defaultMessage: 'Agentic models',
      }),
      featureDescription: i18n.translate('xpack.alertzero.inferenceFeature.agenticDescription', {
        defaultMessage:
          'Multi-step work involving tools and iteration, where cost multiplies by the round count, such as diagnosing a noisy detection rule.',
      }),
      recommendedEndpoints: AGENTIC_RECOMMENDED_ENDPOINTS,
    },
  ];

  for (const tier of tiers) {
    const result = register({
      parentFeatureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      taskType: 'chat_completion',
      isTechPreview: true,
      // The tiers are deliberately on different rungs, so letting the cluster-wide default win
      // would collapse them onto one model and lose both the cost saving on the fast tier and the
      // quality on the reasoning one. The hard escape hatch survives: `defaultConnectorOnly`
      // short-circuits before feature resolution, so an operator who wants one model everywhere
      // still gets it.
      ignoreGlobalDefault: true,
      ...tier,
    });

    if (!result.ok) {
      logger.warn(`Failed to register inference feature "${tier.featureId}": ${result.error}`);
    }
  }
};
