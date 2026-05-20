import type { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import type { QuerySchema } from '@kbn/slo-schema';
import React from 'react';
export declare function GroupByField({ dataView, isLoading, filters, }: {
    dataView?: DataView;
    isLoading: boolean;
    filters?: QuerySchema;
}): React.JSX.Element;
export declare const canGroupBy: (field: FieldSpec) => boolean;
