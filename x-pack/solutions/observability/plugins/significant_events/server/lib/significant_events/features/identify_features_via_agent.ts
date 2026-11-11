/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import type { BaseFeature, IgnoredFeature } from '@kbn/significant-events-schema';
import {
  EMPTY_TOKENS,
  buildFeatureIdentificationUserMessage,
  parseFinalizedFeatures,
  type RawFinalizeFeaturesParams,
  type InferenceDocument,
  type ExcludedFeatureSummary,
  type PreviouslyIdentifiedFeature,
} from '@kbn/nightshift-ai';
import { FINALIZE_FEATURES_TOOL_ID } from '../../../agent_builder/skills/feature_identification';
import { chatTokenCountFromModelUsage } from './chat_token_count';

export interface BuildFeatureIdentificationMessageOptions {
  sourceId: string;
  sampleDocuments: InferenceDocument[];
  excludedFeatures?: ExcludedFeatureSummary[];
  previouslyIdentifiedFeatures?: PreviouslyIdentifiedFeature[];
  knownFeatureIds?: string;
}

export function buildFeatureIdentificationMessage({
  sourceId,
  sampleDocuments,
  excludedFeatures,
  previouslyIdentifiedFeatures = [],
  knownFeatureIds = '',
}: BuildFeatureIdentificationMessageOptions): string {
  return buildFeatureIdentificationUserMessage({
    sourceId,
    sampleDocuments: JSON.stringify(sampleDocuments),
    previouslyIdentifiedFeatures:
      previouslyIdentifiedFeatures.length > 0
        ? JSON.stringify(previouslyIdentifiedFeatures)
        : undefined,
    knownFeatureIds: knownFeatureIds || undefined,
    excludedFeatures: excludedFeatures?.length ? JSON.stringify(excludedFeatures) : undefined,
  });
}

/**
 * Reads what the feature identification agent finalized from the conversation the `ai.agent`
 * step stored. The step runs the agent, this reads the `finalize_features` call it made.
 */
export function readFeatureIdentificationResult({
  conversation,
  logger,
}: {
  conversation: Pick<Conversation, 'rounds'>;
  logger: Logger;
}): {
  features: BaseFeature[];
  ignoredFeatures: IgnoredFeature[];
  tokensUsed: ChatCompletionTokenCount;
} {
  const round = conversation.rounds.at(-1);
  // A failed or aborted run leaves its round `completed` with the steps it finished, so a
  // finalize call alone does not mean the run succeeded.
  if (round?.interruption) {
    throw new Error('Feature identification agent run was interrupted');
  }
  const finalizeStep = round?.steps
    .filter(isToolCallStep)
    .findLast(
      (step) =>
        step.tool_id === FINALIZE_FEATURES_TOOL_ID &&
        step.results.some(
          (result) =>
            typeof result.data === 'object' &&
            result.data !== null &&
            'finalized' in result.data &&
            result.data.finalized === true
        )
    );
  if (!finalizeStep) {
    throw new Error('Feature identification agent did not successfully call finalize_features');
  }

  const rawParams = finalizeStep.params as RawFinalizeFeaturesParams;
  if (!Array.isArray(rawParams.features)) {
    throw new Error('Feature identification agent returned invalid finalize_features output');
  }

  const { features, ignoredFeatures } = parseFinalizedFeatures(rawParams, logger);

  return {
    features,
    ignoredFeatures,
    tokensUsed: chatTokenCountFromModelUsage(round?.model_usage) ?? { ...EMPTY_TOKENS },
  };
}
