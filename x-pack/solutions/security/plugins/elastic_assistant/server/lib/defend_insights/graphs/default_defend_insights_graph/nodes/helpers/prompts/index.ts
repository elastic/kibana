/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { InvalidDefendInsightTypeError } from '../../../../../errors';
import { getIncompatibleAntivirusPrompt } from './incompatible_antivirus';

export function getDefendInsightsPrompt({
  type,
  events,
  connectorType,
}: {
  type: DefendInsightType;
  events?: string[];
  connectorType?: string;
}): string {
  if (type === DefendInsightType.Enum.incompatible_antivirus) {
    return getIncompatibleAntivirusPrompt(events, connectorType);
  }

  throw new InvalidDefendInsightTypeError();
}
