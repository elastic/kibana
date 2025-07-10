/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHistoricalResultStub } from '../../../../../../../../stub/get_historical_result_stub';
// eslint-disable-next-line no-restricted-imports
import { isNonLegacyHistoricalResult } from './is_non_legacy_historical_result';

describe('isNonLegacyHistoricalResult', () => {
  describe('given legacy historical result', () => {
    it('should return false', () => {
      const {
        incompatibleFieldMappingItems,
        incompatibleFieldValueItems,
        sameFamilyFieldItems,
        ...legacyHistoricalResult
      } = getHistoricalResultStub('test');

      const result = isNonLegacyHistoricalResult(legacyHistoricalResult);

      expect(result).toBe(false);
    });
  });

  describe('given non-legacy historical result', () => {
    it('should return true', () => {
      const historicalResult = getHistoricalResultStub('test');

      const result = isNonLegacyHistoricalResult(historicalResult);

      expect(result).toBe(true);
    });
  });
});
