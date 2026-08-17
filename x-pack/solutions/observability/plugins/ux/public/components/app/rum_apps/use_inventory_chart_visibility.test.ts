/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVENTORY_CHART_HIDDEN_STORAGE_KEY,
  readInventoryChartHidden,
  writeInventoryChartHidden,
} from './use_inventory_chart_visibility';

describe('inventory chart visibility', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to visible', () => {
    expect(readInventoryChartHidden()).toBe(false);
  });

  it('persists hide across reads', () => {
    writeInventoryChartHidden(true);
    expect(window.localStorage.getItem(INVENTORY_CHART_HIDDEN_STORAGE_KEY)).toBe('true');
    expect(readInventoryChartHidden()).toBe(true);
  });
});
