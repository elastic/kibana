/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InventoryItemType, InventoryModel } from '../types';
import type { InventoryMetricsConfig } from './metrics/types';

export function createInventoryModel<
  TType extends InventoryItemType,
  TMetrics extends InventoryMetricsConfig<any, any, any>
>(id: TType, config: Omit<InventoryModel<TType, TMetrics>, 'id'>): InventoryModel<TType, TMetrics> {
  return { id, ...config };
}
