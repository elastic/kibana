/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { EvaluatorT } from 'langsmith/evaluation';
import { customIncompatibleAntivirusEvaluator } from './customIncompatibleAntivirusEvaluator';

export const getDefendInsightsCustomEvaluator = ({
  insightType,
}: {
  insightType: DefendInsightType;
}): EvaluatorT => {
  switch (insightType) {
    case DefendInsightType.Enum.incompatible_antivirus:
    default:
      return customIncompatibleAntivirusEvaluator;
  }
};
