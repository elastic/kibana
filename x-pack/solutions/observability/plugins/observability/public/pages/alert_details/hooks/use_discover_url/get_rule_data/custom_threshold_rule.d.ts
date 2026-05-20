import type { Rule } from '@kbn/alerts-ui-shared';
import type { Filter } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
export declare const getCustomThresholdRuleData: ({ rule }: {
    rule: Rule;
}) => {
    discoverAppLocatorParams: {
        filters: Filter[];
        dataViewId: string | undefined;
        dataViewSpec: DataViewSpec | undefined;
        timeRange: import("@kbn/es-query").TimeRange;
        query: {
            query: string;
            language: string;
        };
    };
};
