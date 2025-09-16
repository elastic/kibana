/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InventoryItemType, InventoryModel } from '../types';
import type { AggregationConfigMap, FormulasConfigMap, ChartsConfigMap } from './metrics/types';

export function createInventoryModel<
  TType extends InventoryItemType,
  TAggsConfigMap extends AggregationConfigMap,
  TFormulasConfigMap extends FormulasConfigMap | undefined = undefined,
  TCharts extends ChartsConfigMap | undefined = undefined
>(
  id: TType,
  config: Omit<InventoryModel<TType, TAggsConfigMap, TFormulasConfigMap, TCharts>, 'id'>
): InventoryModel<TType, TAggsConfigMap, TFormulasConfigMap, TCharts> {
  return { id, ...config };
}
