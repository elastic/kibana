/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';

import type { DefendInsightsGenerationPrompts } from '../prompts';
import { InvalidDefendInsightTypeError } from '../../../errors';
import { getDefendInsightsIncompatibleAntiVirusGenerationSchema } from './incompatible_antivirus';
import { getDefendInsightsPolicyResponseFailureGenerationSchema } from './policy_response_failure';

export function getDefendInsightsSchema({
  type,
  prompts,
}: {
  type: DefendInsightType;
  prompts: DefendInsightsGenerationPrompts;
}) {
  switch (type) {
    case DefendInsightType.Enum.incompatible_antivirus:
      return getDefendInsightsIncompatibleAntiVirusGenerationSchema(prompts);
    case DefendInsightType.Enum.policy_response_failure:
      return getDefendInsightsPolicyResponseFailureGenerationSchema(prompts);
    default:
      throw new InvalidDefendInsightTypeError();
  }
}
