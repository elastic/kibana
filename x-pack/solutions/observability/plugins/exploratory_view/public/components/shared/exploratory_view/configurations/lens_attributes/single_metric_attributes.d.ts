import type { MetricState, OperationType, PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ColumnFilter, MetricOption } from '../../types';
import type { SeriesConfig } from '../../../../..';
import type { LayerConfig } from '../lens_attributes';
import { LensAttributes } from '../lens_attributes';
export declare class SingleMetricLensAttributes extends LensAttributes {
    columnId: string;
    metricStateOptions?: MetricOption['metricStateOptions'];
    constructor(layerConfigs: LayerConfig[], reportType: string, dslFilters?: QueryDslQueryContainer[]);
    getSingleMetricLayer(): PersistedIndexPatternLayer | undefined;
    getFormulaLayer({ formula, label, dataView, format, filter, }: {
        formula: string;
        label?: string;
        format?: string;
        filter?: Query;
        dataView: DataView;
    }): {
        columnOrder: string[];
        columns: {
            [x: string]: {
                label: string;
                customLabel: boolean;
                dataType: "number";
                filter: Query | undefined;
                isBucketed: false;
                operationType: "formula";
                params: {
                    formula: string;
                    isFormulaBroken: false;
                    format: {
                        id: string;
                        params: {
                            decimals: number;
                        };
                    } | undefined;
                };
                references: never[];
            };
        };
    };
    getPercentileLayer({ sourceField, operationType, seriesConfig, columnLabel, columnFilter, }: {
        sourceField: string;
        operationType?: OperationType;
        seriesConfig: SeriesConfig;
        columnLabel?: string;
        columnFilter?: ColumnFilter;
    }): {
        columns: {
            [x: string]: {
                label: string;
                filter: ColumnFilter | undefined;
                customLabel: boolean;
                operationType: typeof import("@kbn/lens-formula-docs").PERCENTILE_ID;
                params: {
                    percentile: number;
                    format?: import("@kbn/lens-common").ValueFormatConfig;
                };
                sourceField: string;
                timeScale?: import("@kbn/lens-common").TimeScaleUnit;
                reducedTimeRange?: string;
                timeShift?: string;
                sortingHint?: import("@kbn/lens-common").SortingHint;
                interval?: string;
                dataType: import("@kbn/lens-common/types").DataType;
                isBucketed: boolean;
                scale?: "ordinal" | "interval" | "ratio";
                isStaticValue?: boolean;
                hasArraySupport?: boolean;
            };
        };
        columnOrder: string[];
        incompleteColumns: {};
    };
    getMetricState(): MetricState;
}
