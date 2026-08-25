/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseDataTableFilters } from '../use_data_table_filters';

export const useDataTableFilters: jest.Mocked<UseDataTableFilters> = jest.fn(() => ({
  showBuildingBlockAlerts: false,
  showOnlyThreatIndicatorAlerts: false,
  setShowBuildingBlockAlerts: jest.fn(),
  setShowOnlyThreatIndicatorAlerts: jest.fn(),
}));
