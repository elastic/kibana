import type * as rt from 'io-ts';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { ALERT_GROUP, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { RuleTypeParams, TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { Group } from '../../../common/typings';
import { type CustomThresholdSearchSourceFields, type BaseMetricExpressionParams, type CustomMetricExpressionParams, type MetricExpressionParams, type ThresholdParams, type NoDataBehavior } from '../../../common/custom_threshold_rule/types';
import type { ObservabilityPublicStart } from '../../plugin';
export type CustomThresholdPrefillOptions = Partial<Omit<ThresholdParams, 'criteria'> & {
    criteria: Array<Partial<MetricExpressionParams>>;
}>;
export interface AlertContextMeta {
    adHocDataViewList: DataView[];
    currentOptions?: CustomThresholdPrefillOptions;
}
export type MetricExpression = Omit<CustomMetricExpressionParams, 'timeSize' | 'timeUnit'> & {
    timeSize?: BaseMetricExpressionParams['timeSize'];
    timeUnit?: BaseMetricExpressionParams['timeUnit'];
};
export interface AlertParams {
    criteria: MetricExpression[];
    groupBy?: string | string[];
    sourceId: string;
    filterQuery?: string;
    alertOnNoData?: boolean;
    alertOnGroupDisappear?: boolean;
    searchConfiguration: CustomThresholdSearchSourceFields;
    shouldDropPartialBuckets?: boolean;
    noDataBehavior?: NoDataBehavior;
}
export interface InfraClientStartDeps {
    cases: CasesPublicStart;
    charts: ChartsPluginStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    discover: DiscoverStart;
    embeddable?: EmbeddableStart;
    lens: LensPublicStart;
    observability: ObservabilityPublicStart;
    observabilityShared: ObservabilitySharedPluginStart;
    share: SharePluginStart;
    spaces: SpacesPluginStart;
    storage: IStorageWrapper;
    triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
    uiActions: UiActionsStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    kql: KqlPluginStart;
    usageCollection: UsageCollectionStart;
}
export type RendererResult = React.ReactElement<any> | null;
export type RendererFunction<RenderArgs, Result = RendererResult> = (args: RenderArgs) => Result;
export interface CustomThresholdRuleTypeParams extends RuleTypeParams {
    criteria: CustomMetricExpressionParams[];
    searchConfiguration: CustomThresholdSearchSourceFields;
    groupBy?: string | string[];
}
export interface CustomThresholdAlertFields {
    [ALERT_GROUP]?: Group[];
    [ALERT_RULE_PARAMETERS]: CustomThresholdRuleTypeParams;
}
export declare const expressionTimestampsRT: rt.TypeC<{
    fromTimestamp: rt.NumberC;
    toTimestamp: rt.NumberC;
    interval: rt.StringC;
    timeFieldName: rt.StringC;
}>;
export type ExpressionTimestampsRT = rt.TypeOf<typeof expressionTimestampsRT>;
export declare const metricsExplorerMetricRT: rt.IntersectionC<[rt.TypeC<{
    name: rt.StringC;
    aggregation: rt.Type<import("../../../common/custom_threshold_rule/types").Aggregators, import("../../../common/custom_threshold_rule/types").Aggregators, unknown>;
}>, rt.PartialC<{
    field: rt.StringC;
    filter: rt.StringC;
}>]>;
export declare const expressionOptionsRT: rt.IntersectionC<[rt.TypeC<{
    aggregation: rt.StringC;
    metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        aggregation: rt.StringC;
    }>, rt.PartialC<{
        field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
        custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            name: rt.StringC;
            aggregation: rt.Type<import("../../../common/custom_threshold_rule/types").Aggregators, import("../../../common/custom_threshold_rule/types").Aggregators, unknown>;
        }>, rt.PartialC<{
            field: rt.StringC;
            filter: rt.StringC;
        }>]>>;
        equation: rt.StringC;
    }>]>>;
}>, rt.PartialC<{
    limit: rt.NumberC;
    groupBy: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
    filterQuery: rt.StringC;
    source: rt.StringC;
    forceInterval: rt.BooleanC;
    dropLastBucket: rt.BooleanC;
}>]>;
export type MetricsExplorerMetricRT = rt.TypeOf<typeof metricsExplorerMetricRT>;
export type ExpressionOptions = rt.TypeOf<typeof expressionOptionsRT>;
export declare const timeRangeRT: rt.TypeC<{
    from: rt.NumberC;
    to: rt.NumberC;
    interval: rt.StringC;
}>;
export declare const afterKeyObjectRT: rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>;
export declare const metricsExplorerPageInfoRT: rt.TypeC<{
    total: rt.NumberC;
    afterKey: rt.UnionC<[rt.StringC, rt.NullC, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>]>;
}>;
export declare const metricsExplorerColumnTypeRT: rt.KeyofC<{
    date: null;
    number: null;
    string: null;
}>;
export declare const metricsExplorerColumnRT: rt.TypeC<{
    name: rt.StringC;
    type: rt.KeyofC<{
        date: null;
        number: null;
        string: null;
    }>;
}>;
export declare const metricsExplorerRowRT: rt.IntersectionC<[rt.TypeC<{
    timestamp: rt.NumberC;
}>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>;
export declare const metricsExplorerSeriesRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    columns: rt.ArrayC<rt.TypeC<{
        name: rt.StringC;
        type: rt.KeyofC<{
            date: null;
            number: null;
            string: null;
        }>;
    }>>;
    rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        timestamp: rt.NumberC;
    }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
}>, rt.PartialC<{
    keys: rt.ArrayC<rt.StringC>;
}>]>;
export declare const metricsExplorerResponseRT: rt.TypeC<{
    series: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        columns: rt.ArrayC<rt.TypeC<{
            name: rt.StringC;
            type: rt.KeyofC<{
                date: null;
                number: null;
                string: null;
            }>;
        }>>;
        rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            timestamp: rt.NumberC;
        }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
    }>, rt.PartialC<{
        keys: rt.ArrayC<rt.StringC>;
    }>]>>;
    pageInfo: rt.TypeC<{
        total: rt.NumberC;
        afterKey: rt.UnionC<[rt.StringC, rt.NullC, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>]>;
    }>;
}>;
export type MetricsExplorerRow = rt.TypeOf<typeof metricsExplorerRowRT>;
export type MetricsExplorerSeries = rt.TypeOf<typeof metricsExplorerSeriesRT>;
export type MetricsExplorerResponse = rt.TypeOf<typeof metricsExplorerResponseRT>;
