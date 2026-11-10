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
 * Every endpoint below is a literal. `defaultInferenceEndpoints` has constants for only a few
 * current-generation endpoints, and a constant would not prove the endpoint is provisioned
 * anyway. GA dates track `AGENT_BUILDER_RECOMMENDED_ENDPOINTS`, the list kept closest
 * to what EIS actually serves; endpoints Agent Builder does not recommend carry no date.
 *
 * Each list is ordered by measured quality on the workers that tier runs, not by model size, so
 * the same model may lead more than one tier. Every list spans at least two vendors, so a tier
 * that loses a vendor degrades to a comparable model rather than collapsing onto the cluster
 * default.
 *
 * The last entry of each tier is served by the Serverless trial EIS catalog, which provisions none
 * of the entries above it. Without it every tier resolves to the first connector in the catalog,
 * so all three collapse onto one arbitrary model.
 */

// The efficient tier runs alert triage on every sweep, and a wrong verdict can become a close
// proposal. GPT-6 Luna scored 38/48 on the triage evals; GPT-6 Sol scored 47/48 with a faster
// median run. GLM 5.2 is the trial-served entry (47/48).
const EFFICIENT_RECOMMENDED_ENDPOINTS = [
  '.openai-gpt-6-sol-chat_completion', // GPT-6 Sol, GA 2026-09-28
  '.anthropic-claude-5.5-sonnet-chat_completion', // Claude Sonnet 5.5, GA 2026-09-28
  '.zai-glm-5-2-chat_completion', // GLM 5.2
];

// The balanced tier loops over many tool rounds (diagnosing a noisy rule, endpoint forensics).
// Claude Sonnet 5.5 scored highest on rule-tuning quality, with GPT-6 Sol close behind. Sonnet 5
// is the trial-served entry and the strongest catalog model measured on rule tuning.
const BALANCED_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-5.5-sonnet-chat_completion', // Claude Sonnet 5.5, GA 2026-09-28
  '.openai-gpt-6-sol-chat_completion', // GPT-6 Sol, GA 2026-09-28
  '.anthropic-claude-5-sonnet-chat_completion', // Claude Sonnet 5, GA 2026-07-03
];

// GPT-6 Sol and Claude Opus 5.5 tie on Attack Discovery Worker verdicts, where older frontier
// models fell well behind; Sol also leads the FP/TP judge on accuracy and claim grounding. Kimi
// K3 is the strongest trial-served entry.
const FRONTIER_RECOMMENDED_ENDPOINTS = [
  '.openai-gpt-6-sol-chat_completion', // GPT-6 Sol, GA 2026-09-28
  '.anthropic-claude-5.5-opus-chat_completion', // Claude Opus 5.5, GA 2026-09-22
  '.moonshot-kimi-k3-chat_completion', // Kimi K3
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
  // the rows read from the highest-volume calls to the most demanding ones.
  const tiers = [
    {
      featureId: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.alertzero.inferenceFeature.efficientName', {
        defaultMessage: 'Efficient models',
      }),
      featureDescription: i18n.translate('xpack.alertzero.inferenceFeature.efficientDescription', {
        defaultMessage:
          'Calls that run on every alert sweep, such as triaging alerts and checking detection coverage. A triage verdict can lead to a close proposal, so choose a model that stays accurate at volume.',
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
          'Calls that use tools over many steps, such as diagnosing a noisy rule or analyzing endpoint forensics. Choose a model that is strong at multi-step tool use.',
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
      // Each list is picked from evals of the workers on that tier, so letting the cluster-wide
      // default win would put those workers on a model that may score far lower on them. The hard
      // escape hatch survives: `defaultConnectorOnly`
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
