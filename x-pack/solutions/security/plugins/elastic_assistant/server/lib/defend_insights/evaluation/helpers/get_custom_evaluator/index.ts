/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorT } from 'langsmith/evaluation';
import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { InvalidDefendInsightTypeError } from '../../../errors';
import { customIncompatibleAntivirusEvaluator } from './customIncompatibleAntivirusEvaluator';
import { customPolicyResponseFailureEvaluator } from './customPolicyResponseFailureEvaluator';

export const getDefendInsightsCustomEvaluator = ({
  insightType,
}: {
  insightType: DefendInsightType;
}): EvaluatorT => {
  switch (insightType) {
    case DefendInsightType.Enum.incompatible_antivirus:
      return customIncompatibleAntivirusEvaluator;
    case DefendInsightType.Enum.policy_response_failure:
      return customPolicyResponseFailureEvaluator;
    default:
      throw new InvalidDefendInsightTypeError();
  }
};
