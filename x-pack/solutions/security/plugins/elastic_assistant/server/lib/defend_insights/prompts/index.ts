/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InferenceConnector } from '@kbn/inference-common';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import type { DefendInsightsCombinedPrompts } from '@kbn/discoveries';
import { InvalidDefendInsightTypeError } from '@kbn/discoveries';

import { getIncompatibleAntivirusPrompt } from './incompatible_antivirus';
import { getPolicyResponseFailurePrompt } from './policy_response_failure';

export type {
  DefendInsightsCombinedPrompts,
  DefendInsightsGenerationPrompts,
  DefendInsightsPrompts,
} from '@kbn/discoveries';

export function getDefendInsightsPrompt({
  type,
  ...args
}: {
  type: DefendInsightType;
  getInferenceConnectorById?: (id: string) => Promise<InferenceConnector>;
  connectorId: string;
  model?: string;
  provider?: string;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<DefendInsightsCombinedPrompts> {
  switch (type) {
    case DefendInsightType.enum.incompatible_antivirus:
      return getIncompatibleAntivirusPrompt(args);
    case DefendInsightType.enum.policy_response_failure:
      return getPolicyResponseFailurePrompt(args);
    default:
      throw new InvalidDefendInsightTypeError();
  }
}
