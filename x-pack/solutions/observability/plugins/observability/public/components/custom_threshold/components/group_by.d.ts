import type { DataViewFieldBase } from '@kbn/es-query';
import React from 'react';
export type MetricsExplorerFields = Array<DataViewFieldBase & {
    aggregatable: boolean;
}>;
export type GroupBy = string | null | string[];
export interface GroupByOptions {
    groupBy: GroupBy;
}
interface Props {
    options: GroupByOptions;
    onChange: (groupBy: GroupBy) => void;
    fields: MetricsExplorerFields;
}
export declare function GroupBy({ options, onChange, fields, ...rest }: Props): React.JSX.Element;
export {};
