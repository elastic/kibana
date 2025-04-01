/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPatternResultTooltip } from './get_pattern_result_tooltip';
import { ALL_PASSED, SOME_FAILED, SOME_UNCHECKED } from '../translations';

describe('helpers', () => {
  describe('getPatternResultTooltip', () => {
    test('it returns the expected tool tip when `incompatible` is undefined', () => {
      expect(getPatternResultTooltip(undefined)).toEqual(SOME_UNCHECKED);
    });

    test('it returns the expected tool tip when `incompatible` is zero', () => {
      expect(getPatternResultTooltip(0)).toEqual(ALL_PASSED);
    });

    test('it returns the expected tool tip when `incompatible` is non-zero', () => {
      expect(getPatternResultTooltip(1)).toEqual(SOME_FAILED);
    });
  });
});
