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
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';

/**
 * Every endpoint below is a literal. `defaultInferenceEndpoints` stops at Claude 4.6 and GPT-5.4,
 * so no current-generation endpoint has a constant, and a constant would not prove the endpoint is
 * provisioned anyway. GA dates track `AGENT_BUILDER_RECOMMENDED_ENDPOINTS`, the list kept closest
 * to what EIS actually serves; endpoints Agent Builder does not recommend carry no date.
 *
 * Each list is the product-recommended default for its tier, one model per vendor, so a tier that
 * loses its primary degrades to a comparable model from another vendor rather than collapsing onto
 * the cluster default.
 */

// The efficient tier takes the highest-volume and lowest-stakes calls we make, so every model here
// is small: a mid-size or frontier fallback would silently bill the high-volume path at those rates.
const EFFICIENT_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-4.5-haiku-chat_completion', // Claude Haiku 4.5, GA 2025-10-01
  '.google-gemini-3.5-flash-lite-chat_completion', // Gemini 3.5 Flash Lite, GA 2026-07-21
  '.openai-gpt-5.6-luna-chat_completion', // GPT-5.6 Luna
];

// The balanced tier covers calls where accuracy matters but which either run often (triaging every
// alert) or loop over many tool rounds (diagnosing a rule), so frontier latency and cost would
// multiply by the call or round count. A strong mid-size model is the right rung.
const BALANCED_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-5-sonnet-chat_completion', // Claude Sonnet 5, GA 2026-07-03
  '.openai-gpt-5.6-terra-chat_completion', // GPT-5.6 Terra
  '.google-gemini-3.6-flash-chat_completion', // Gemini 3.6 Flash
];

// Attack Discovery reads a whole batch of alerts and rule creation drafts an ES|QL rule from a gap
// description, both single-pass and both judged on the quality of one output, so they get the
// frontier model. Sonnet sits last as the one cross-rung fallback, so losing both frontier models
// degrades quality rather than failing the run.
const FRONTIER_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-5-opus-chat_completion', // Claude Opus 5, GA 2026-07-24
  '.openai-gpt-5.6-sol-chat_completion', // GPT-5.6 Sol, GA 2026-07-09
  '.anthropic-claude-5-sonnet-chat_completion', // Claude Sonnet 5, GA 2026-07-03
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
      featureId: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.alertzero.inferenceFeature.efficientName', {
        defaultMessage: 'Efficient models',
      }),
      featureDescription: i18n.translate('xpack.alertzero.inferenceFeature.efficientDescription', {
        defaultMessage:
          'Quick, lightweight judgment on calls that run often, such as checking detection coverage. Choose a small, low-cost model.',
      }),
      recommendedEndpoints: EFFICIENT_RECOMMENDED_ENDPOINTS,
    },
    {
      featureId: ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.alertzero.inferenceFeature.balancedName', {
        defaultMessage: 'Balanced models',
      }),
      featureDescription: i18n.translate('xpack.alertzero.inferenceFeature.balancedDescription', {
        defaultMessage:
          'Calls where accuracy matters but that run often or use tools over many steps, such as triaging alerts or diagnosing a noisy rule. Choose a strong mid-size model.',
      }),
      recommendedEndpoints: BALANCED_RECOMMENDED_ENDPOINTS,
    },
    {
      featureId: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.alertzero.inferenceFeature.frontierName', {
        defaultMessage: 'Frontier models',
      }),
      featureDescription: i18n.translate('xpack.alertzero.inferenceFeature.frontierDescription', {
        defaultMessage:
          'Complex, single-pass work where output quality matters most, such as generating attack discoveries or drafting a detection rule. Choose your most capable model.',
      }),
      recommendedEndpoints: FRONTIER_RECOMMENDED_ENDPOINTS,
    },
  ];

  for (const tier of tiers) {
    const result = register({
      parentFeatureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      taskType: 'chat_completion',
      isTechPreview: true,
      // The tiers are deliberately on different rungs, so letting the cluster-wide default win
      // would collapse them onto one model and lose both the cost saving on the efficient tier and
      // the quality on the frontier one. The hard escape hatch survives: `defaultConnectorOnly`
      // short-circuits before feature resolution, so an operator who wants one model everywhere
      // still gets it.
      ignoreGlobalDefault: true,
      ...tier,
    });

    if (!result.ok) {
      logger.warn(`Failed to register inference feature "${tier.featureId}": ${result.error}`);
    }
  }

  // Not a cost rung. Attack Discovery, alert triage, the FP/TP judge, and Hunt Watch
  // read a model saved here and otherwise stay on their tier, so the row recommends
  // nothing and ignores the global default. It is the only AlertZero row that lists
  // template-required endpoints. The parent row is never written by the settings form
  // and also recommends nothing, so an unset row resolves to no connector under
  // onlyReturnConfigured and callers that list this id first fall through to their tier.
  // Hunt ES|QL generation keeps Frontier when the saved endpoint requires a template,
  // because that generator writes its own prompts.
  const templateModelsResult = register({
    parentFeatureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
    taskType: 'chat_completion',
    isTechPreview: true,
    ignoreGlobalDefault: true,
    allowTemplateRequiredModels: true,
    featureId: ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
    featureName: i18n.translate('xpack.alertzero.inferenceFeature.templateModelsName', {
      defaultMessage: 'Cyber domain models',
    }),
    featureDescription: i18n.translate(
      'xpack.alertzero.inferenceFeature.templateModelsDescription',
      {
        defaultMessage:
          'OpenAI Daybreak models for Attack Discovery, alert triage, the false-positive judge, and Hunt Watch. A Daybreak endpoint requires a prompt template, so it is listed only here. A model saved here replaces the tier those calls use. Leave this empty to keep Attack Discovery and the judge on Frontier models, alert triage on Efficient models, and Hunt dataset matching and recommendations on Efficient models with technique extraction on Frontier models. Hunt ES|QL generation keeps the Frontier model when the saved endpoint requires a prompt template.',
      }
    ),
    recommendedEndpoints: [],
  });

  if (!templateModelsResult.ok) {
    logger.warn(
      `Failed to register inference feature "${ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID}": ${templateModelsResult.error}`
    );
  }
};
