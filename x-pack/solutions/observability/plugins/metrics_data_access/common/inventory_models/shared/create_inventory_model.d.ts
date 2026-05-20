import type { InventoryItemType, InventoryModel } from '../types';
import type { AggregationConfigMap, FormulasConfigMap, ChartsConfigMap } from './metrics/types';
export declare function createInventoryModel<TType extends InventoryItemType, TAggsConfigMap extends AggregationConfigMap, TFormulasConfigMap extends FormulasConfigMap | undefined = undefined, TCharts extends ChartsConfigMap | undefined = undefined>(id: TType, config: Omit<InventoryModel<TType, TAggsConfigMap, TFormulasConfigMap, TCharts>, 'id'>): InventoryModel<TType, TAggsConfigMap, TFormulasConfigMap, TCharts>;
