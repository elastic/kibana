/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { InvalidDefendInsightTypeError } from '../../../errors';
import { DefendInsightsGenerationPrompts } from '../prompts/incompatible_antivirus';
import { getDefendInsightsIncompatibleVirusGenerationSchema } from './incompatible_antivirus';

export function getDefendInsightsSchema({
  type,
  prompts,
}: {
  type: DefendInsightType;
  prompts: DefendInsightsGenerationPrompts;
}) {
  if (type === DefendInsightType.Enum.incompatible_antivirus) {
    return getDefendInsightsIncompatibleVirusGenerationSchema(prompts);
  }

  throw new InvalidDefendInsightTypeError();
}
