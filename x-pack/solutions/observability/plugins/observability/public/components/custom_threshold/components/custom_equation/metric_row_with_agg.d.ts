import type { DataViewBase } from '@kbn/es-query';
import React from 'react';
import type { KqlPluginStart } from '@kbn/kql/public';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import type { MetricRowBaseProps, NormalizedFields } from './types';
interface MetricRowWithAggProps extends MetricRowBaseProps {
    aggType?: Aggregators;
    field?: string;
    dataView: DataViewBase;
    filter?: string;
    fields: NormalizedFields;
    kql: KqlPluginStart;
}
export declare function MetricRowWithAgg({ name, aggType, field, onDelete, dataView, filter, disableDelete, fields, aggregationTypes, onChange, errors, kql, }: MetricRowWithAggProps): React.JSX.Element;
export {};
