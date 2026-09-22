/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID,
  THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID,
} from '../../common/threat_intel';

/**
 * Registered by `elastic_assistant`, which `security_solution` depends on, so
 * the parent always exists by the time we register these children. Duplicated
 * as a literal (also in `server/plugin.ts`) because `elastic_assistant` keeps it
 * in its plugin `common/`, not in a shared package.
 */
const SECURITY_INFERENCE_PARENT_FEATURE_ID = 'security_search_inference_parent';

// Taxonomy, severity, and relevance run on every report on a 4h schedule, so
// this is the high-volume, low-stakes tier: a small model (Haiku) keeps the
// bill and the wall clock down. Sonnet 4.6 is the fallback so enrich degrades
// to a still-current model instead of collapsing onto the cluster default when
// Haiku is not provisioned; it stays below the Opus tier Diamond uses. The
// primary is a literal because Haiku 4.5 has no `defaultInferenceEndpoints`
// constant, and a constant would not prove the endpoint is provisioned anyway.
const ENRICH_RECOMMENDED_MODELS = [
  '.anthropic-claude-4.5-haiku-chat_completion',
  defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
];

// Diamond extraction is the one deep-reasoning stage: it reads the whole report
// and produces structured adversary analysis, so it gets the frontier model.
const DIAMOND_RECOMMENDED_MODELS = [
  defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_OPUS,
  defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
];

/**
 * Registers the threat intel enrich and Diamond inference features so operators
 * pick each model in Stack Management > Model Settings. No-op when the optional
 * `searchInferenceEndpoints` plugin is unavailable.
 */
export const registerThreatIntelInferenceFeatures = (
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup | undefined,
  logger: Logger
): void => {
  if (!searchInferenceEndpoints) {
    logger.debug(
      'searchInferenceEndpoints plugin not available, skipping threat intel inference feature registration'
    );
    return;
  }

  const features = [
    {
      featureId: THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID,
      featureName: 'Threat Intelligence enrichment',
      featureDescription:
        'Model used to extract taxonomy, severity, and relevance from threat reports.',
      recommendedEndpoints: ENRICH_RECOMMENDED_MODELS,
    },
    {
      featureId: THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID,
      featureName: 'Threat Intelligence Diamond extraction',
      featureDescription:
        'Model used to extract the Diamond Model adversary analysis from threat reports.',
      recommendedEndpoints: DIAMOND_RECOMMENDED_MODELS,
    },
  ];

  for (const feature of features) {
    const result = searchInferenceEndpoints.features.register({
      parentFeatureId: SECURITY_INFERENCE_PARENT_FEATURE_ID,
      taskType: 'chat_completion',
      isTechPreview: true,
      // The two stages are deliberately on different tiers, so letting the
      // cluster-wide default win would collapse them onto one model and lose
      // both the cost saving on enrich and the quality on Diamond.
      ignoreGlobalDefault: true,
      ...feature,
    });

    if (!result.ok) {
      logger.warn(`Failed to register inference feature "${feature.featureId}": ${result.error}`);
    }
  }
};
