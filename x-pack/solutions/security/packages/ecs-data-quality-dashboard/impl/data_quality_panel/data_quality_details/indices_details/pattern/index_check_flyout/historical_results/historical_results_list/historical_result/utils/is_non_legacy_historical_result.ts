/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HistoricalResult, NonLegacyHistoricalResult } from '../../../../../../../../types';

export const isNonLegacyHistoricalResult = (
  historicalResult: HistoricalResult
): historicalResult is NonLegacyHistoricalResult => {
  return (
    'incompatibleFieldMappingItems' in historicalResult &&
    'incompatibleFieldValueItems' in historicalResult &&
    'sameFamilyFieldItems' in historicalResult
  );
};
