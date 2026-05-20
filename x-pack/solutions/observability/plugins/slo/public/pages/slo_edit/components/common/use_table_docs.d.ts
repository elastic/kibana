import type { FieldPath } from 'react-hook-form';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { CreateSLOForm } from '../../types';
export declare const useTableDocs: ({ sampleSize, name, dataView, range, }: {
    range: TimeRange;
    dataView: DataView;
    sampleSize: number;
    name: FieldPath<CreateSLOForm>;
}) => {
    data: import("@kbn/es-types").ESSearchResponse<unknown, {
        index: string;
        size: number;
        query: {
            bool: {
                filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
            };
        };
    }, {
        restTotalHitsAsInt: false;
    }>;
    loading: boolean;
    error: Error | undefined;
};
