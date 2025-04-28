/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { getDefendInsightsCustomEvaluator } from '.';
import { customIncompatibleAntivirusEvaluator } from './customIncompatibleAntivirusEvaluator';

describe('getDefendInsightsCustomEvaluator', () => {
  it('should return customIncompatibleAntivirusEvaluator for incompatible_antivirus', () => {
    const evaluator = getDefendInsightsCustomEvaluator({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
    });

    expect(evaluator).toBe(customIncompatibleAntivirusEvaluator);
  });

  it('should default to customIncompatibleAntivirusEvaluator for unknown insightType', () => {
    const evaluator = getDefendInsightsCustomEvaluator({
      insightType: 'some_unknown_type' as DefendInsightType,
    });

    expect(evaluator).toBe(customIncompatibleAntivirusEvaluator);
  });
});
