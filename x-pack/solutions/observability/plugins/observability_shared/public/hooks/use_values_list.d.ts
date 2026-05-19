import type { ESFilter } from '@kbn/es-types';
import type { IInspectorInfo } from '@kbn/data-plugin/common';
export interface Props {
    sourceField: string;
    label: string;
    query?: string;
    dataViewTitle?: string;
    filters?: ESFilter[];
    time?: {
        from: string;
        to: string;
    };
    keepHistory?: boolean;
    cardinalityField?: string;
    inspector?: IInspectorInfo;
}
export interface ListItem {
    label: string;
    count: number;
}
export declare const useValuesList: ({ sourceField, dataViewTitle, query, filters, time, label, keepHistory, cardinalityField, }: Props) => {
    values: ListItem[];
    loading?: boolean;
};
