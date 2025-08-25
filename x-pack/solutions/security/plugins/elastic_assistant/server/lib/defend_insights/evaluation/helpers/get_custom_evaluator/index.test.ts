/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { InvalidDefendInsightTypeError } from '../../../errors';
import { customIncompatibleAntivirusEvaluator } from './customIncompatibleAntivirusEvaluator';
import { getDefendInsightsCustomEvaluator } from '.';

describe('getDefendInsightsCustomEvaluator', () => {
  it('should return customIncompatibleAntivirusEvaluator for incompatible_antivirus', () => {
    const evaluator = getDefendInsightsCustomEvaluator({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
    });

    expect(evaluator).toBe(customIncompatibleAntivirusEvaluator);
  });

  it('should throw for unknown insightType', () => {
    expect(() =>
      getDefendInsightsCustomEvaluator({
        insightType: 'some_unknown_type' as DefendInsightType,
      })
    ).toThrowError(new InvalidDefendInsightTypeError());
  });
});
