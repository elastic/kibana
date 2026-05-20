import { type Filter } from '@kbn/es-query';
import type { AvgIndexPatternColumn, CardinalityIndexPatternColumn, CountIndexPatternColumn, DataType, DateHistogramIndexPatternColumn, FieldBasedIndexPatternColumn, FiltersIndexPatternColumn, FormulaIndexPatternColumn, FormulaPublicApi, LastValueIndexPatternColumn, MaxIndexPatternColumn, MedianIndexPatternColumn, MinIndexPatternColumn, OperationType, PercentileIndexPatternColumn, PersistedIndexPatternLayer, RangeIndexPatternColumn, SeriesType, SumIndexPatternColumn, TermsIndexPatternColumn, TypedLensByValueInput, XYVisualizationState, HeatmapVisualizationState, MetricState } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ColumnFilter, MetricOption, ParamFilter, SeriesConfig, SupportedOperations, UrlFilter, URLReportDefinition } from '../types';
export declare function getLayerReferenceName(layerId: string): string;
export declare function buildNumberColumn(sourceField: string): {
    sourceField: string;
    dataType: DataType;
    isBucketed: boolean;
};
export declare function getPercentileParam(operationType: string): {
    percentile: number;
};
export declare const parseCustomFieldName: (seriesConfig: SeriesConfig, selectedMetricField?: string) => (Partial<MetricOption> & {
    fieldName: string;
    columnLabel?: string;
    columnField?: string;
}) | MetricOption[];
type MainYAxisColType = ReturnType<LensAttributes['getMainYAxis']>;
export interface LayerConfig {
    filters?: UrlFilter[];
    seriesConfig: SeriesConfig;
    breakdown?: string;
    seriesType?: SeriesType;
    operationType?: OperationType;
    reportDefinitions: URLReportDefinition;
    time: {
        to: string;
        from: string;
    };
    dataView: DataView;
    selectedMetricField: string;
    color: string;
    name: string;
    showPercentileAnnotations?: boolean;
}
export declare class LensAttributes {
    layers: Record<string, PersistedIndexPatternLayer>;
    visualization?: XYVisualizationState | HeatmapVisualizationState | MetricState;
    layerConfigs: LayerConfig[];
    isMultiSeries?: boolean;
    seriesReferenceLines: Record<string, {
        layerData: PersistedIndexPatternLayer;
        layerState: XYVisualizationState['layers'];
        dataView: DataView;
    }>;
    globalFilter?: {
        query: string;
        language: string;
    };
    reportType: string;
    lensFormulaHelper?: FormulaPublicApi;
    dslFilters?: QueryDslQueryContainer[];
    constructor(layerConfigs: LayerConfig[], reportType: string, dslFilters?: QueryDslQueryContainer[]);
    getGlobalFilter(isMultiSeries: boolean): {
        query: string;
        language: string;
    } | undefined;
    getBreakdownColumn({ sourceField, layerId, layerConfig, alphabeticOrder, size, }: {
        sourceField: string;
        layerId: string;
        layerConfig: LayerConfig;
        alphabeticOrder?: boolean;
        size?: number;
    }): TermsIndexPatternColumn;
    getNumberRangeColumn(sourceField: string, seriesConfig: SeriesConfig, label?: string): RangeIndexPatternColumn;
    getFiltersColumn({ label, paramFilters, }: {
        paramFilters: ParamFilter[];
        label?: string;
    }): FiltersIndexPatternColumn;
    getNumberColumn({ seriesConfig, label, sourceField, columnType, columnFilter, operationType, }: {
        sourceField: string;
        columnType?: string;
        columnFilter?: ColumnFilter;
        operationType?: SupportedOperations | 'last_value';
        label?: string;
        seriesConfig: SeriesConfig;
    }): CardinalityIndexPatternColumn | LastValueIndexPatternColumn | SumIndexPatternColumn | AvgIndexPatternColumn | MinIndexPatternColumn | MaxIndexPatternColumn | MedianIndexPatternColumn | PercentileIndexPatternColumn | RangeIndexPatternColumn;
    getLastValueOperationColumn({ sourceField, label, seriesConfig, operationType, columnFilter, }: {
        sourceField: string;
        operationType: 'last_value';
        label?: string;
        seriesConfig: SeriesConfig;
        columnFilter?: ColumnFilter;
    }): LastValueIndexPatternColumn;
    getNumberOperationColumn({ sourceField, label, seriesConfig, operationType, columnFilter, }: {
        sourceField: string;
        operationType: SupportedOperations;
        label?: string;
        seriesConfig: SeriesConfig;
        columnFilter?: ColumnFilter;
    }): MinIndexPatternColumn | MaxIndexPatternColumn | AvgIndexPatternColumn | MedianIndexPatternColumn | SumIndexPatternColumn | CardinalityIndexPatternColumn;
    getPercentileBreakdowns(layerConfig: LayerConfig, layerId: string, columnFilter?: string): Record<string, FieldBasedIndexPatternColumn | FormulaIndexPatternColumn>;
    getPercentileNumberColumn(sourceField: string, percentileValue: string, seriesConfig: SeriesConfig, label?: string): PercentileIndexPatternColumn;
    getDateHistogramColumn(sourceField: string): DateHistogramIndexPatternColumn;
    getTermsColumn(sourceField: string, label?: string): TermsIndexPatternColumn;
    getXAxis(layerConfig: LayerConfig, layerId: string): CountIndexPatternColumn | CardinalityIndexPatternColumn | LastValueIndexPatternColumn | SumIndexPatternColumn | AvgIndexPatternColumn | MinIndexPatternColumn | MaxIndexPatternColumn | MedianIndexPatternColumn | PercentileIndexPatternColumn | FormulaIndexPatternColumn | TermsIndexPatternColumn | DateHistogramIndexPatternColumn | RangeIndexPatternColumn | FiltersIndexPatternColumn | LastValueIndexPatternColumn[];
    getColumnBasedOnType({ sourceField, label, layerConfig, operationType, colIndex, layerId, metricOption, }: {
        sourceField: string;
        metricOption?: MetricOption;
        operationType?: SupportedOperations;
        label?: string;
        layerId: string;
        layerConfig: LayerConfig;
        colIndex?: number;
    }): CountIndexPatternColumn | CardinalityIndexPatternColumn | LastValueIndexPatternColumn | SumIndexPatternColumn | AvgIndexPatternColumn | MinIndexPatternColumn | MaxIndexPatternColumn | MedianIndexPatternColumn | PercentileIndexPatternColumn | FormulaIndexPatternColumn | TermsIndexPatternColumn | DateHistogramIndexPatternColumn | RangeIndexPatternColumn;
    getCustomFieldName({ sourceField, layerConfig, }: {
        sourceField: string;
        layerConfig: LayerConfig;
    }): MetricOption[] | (Partial<MetricOption> & {
        fieldName: string;
        columnLabel?: string;
        columnField?: string;
    });
    getFieldMeta(sourceField: string, layerConfig: LayerConfig, metricOpt?: MetricOption): {
        fieldName: string;
        items: MetricOption[];
        format?: undefined;
        formula?: undefined;
        palette?: undefined;
        fieldMeta?: undefined;
        columnType?: undefined;
        columnLabel?: undefined;
        columnFilters?: undefined;
        timeScale?: undefined;
        paramFilters?: undefined;
        showPercentileAnnotations?: undefined;
    } | {
        format: "number" | "percent" | undefined;
        formula: string | undefined;
        palette: import("@kbn/coloring").PaletteOutput<Record<string, unknown>> | undefined;
        fieldMeta: import("@kbn/data-views-plugin/common").DataViewField | undefined;
        fieldName: string;
        columnType: "range" | "operation" | "unique_count" | "FORMULA_COLUMN" | "FILTER_RECORDS" | "TERMS_COLUMN" | undefined;
        columnLabel: string | undefined;
        columnFilters: ColumnFilter[] | undefined;
        timeScale: string | undefined;
        paramFilters: ParamFilter[] | undefined;
        showPercentileAnnotations: boolean | undefined;
        items?: undefined;
    } | {
        fieldMeta: import("@kbn/data-views-plugin/common").DataViewField | undefined;
        fieldName: string;
        items?: undefined;
        format?: undefined;
        formula?: undefined;
        palette?: undefined;
        columnType?: undefined;
        columnLabel?: undefined;
        columnFilters?: undefined;
        timeScale?: undefined;
        paramFilters?: undefined;
        showPercentileAnnotations?: undefined;
    };
    getMainYAxis(layerConfig: LayerConfig, layerId: string, columnFilter: string): (CountIndexPatternColumn | CardinalityIndexPatternColumn | LastValueIndexPatternColumn | SumIndexPatternColumn | AvgIndexPatternColumn | MinIndexPatternColumn | MaxIndexPatternColumn | MedianIndexPatternColumn | PercentileIndexPatternColumn | FormulaIndexPatternColumn | TermsIndexPatternColumn | DateHistogramIndexPatternColumn | RangeIndexPatternColumn)[] | undefined;
    getChildYAxises(layerConfig: LayerConfig, layerId: string, columnFilter?: string, forAccessorsKeys?: boolean): Record<string, FieldBasedIndexPatternColumn | FormulaIndexPatternColumn>;
    getRecordsColumn(label?: string, columnFilter?: ColumnFilter, timeScale?: string): CountIndexPatternColumn;
    getLayerFilters(layerConfig: LayerConfig, totalLayers: number): string;
    getTimeShift(mainLayerConfig: LayerConfig, layerConfig: LayerConfig, index: number): string | null;
    getLayers(): Record<string, PersistedIndexPatternLayer>;
    getDataLayer({ hasBreakdownColumn, layerId, layerConfig, columnFilter, mainYAxises, timeShift, }: {
        hasBreakdownColumn: boolean;
        layerId: string;
        timeShift: string | null;
        layerConfig: LayerConfig;
        columnFilter: string;
        mainYAxises: MainYAxisColType;
    }): {
        columnOrder: string[];
        columns: {
            [x: string]: any;
        };
        incompleteColumns: {};
    };
    getXyState(): XYVisualizationState;
    getDataLayers(): XYVisualizationState['layers'];
    addThresholdLayer(fieldName: string, layerId: string, { seriesConfig, dataView }: LayerConfig): void;
    getThresholdLayer(fieldName: string, referenceLineLayerId: string, seriesConfig: SeriesConfig): XYVisualizationState['layers'];
    getThresholdColumns(fieldName: string, layerId: string, seriesConfig: SeriesConfig): Record<string, PercentileIndexPatternColumn>;
    getReferences(): {
        internalReferences: {
            id: string;
            name: string;
            type: string;
        }[];
        adHocDataViews: Record<string, DataViewSpec>;
    };
    getFilters(): Filter[];
    getJSON(visualizationType?: 'lnsXY' | 'lnsLegacyMetric' | 'lnsHeatmap', lastRefresh?: number): TypedLensByValueInput['attributes'];
}
export {};
