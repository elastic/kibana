import type { UiCounterMetricType } from '@kbn/analytics';
import { METRIC_TYPE } from '@kbn/analytics';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ObservabilityApp } from '../../typings/common';
/**
 * Note: The usage_collection plugin will take care of sending this data to the telemetry server.
 * You can find the metrics that are collected by these hooks in Stack Telemetry.
 * Search the index `kibana-ui-counter`. You can filter for `eventName` and/or `appName`.
 */
interface TrackOptions {
    app?: ObservabilityApp;
    metricType?: UiCounterMetricType;
    delay?: number;
}
type EffectDeps = unknown[];
interface ServiceDeps {
    usageCollection: UsageCollectionSetup;
}
export type TrackMetricOptions = TrackOptions & {
    metric: string;
};
export type UiTracker = ReturnType<typeof useUiTracker>;
export type TrackEvent = (options: TrackMetricOptions) => void;
export { METRIC_TYPE };
export declare function useUiTracker<Services extends ServiceDeps>({ app: defaultApp, }?: {
    app?: ObservabilityApp;
}): TrackEvent;
export declare function useTrackMetric<Services extends ServiceDeps>({ app, metric, metricType, delay }: TrackMetricOptions, effectDependencies?: EffectDeps): void;
/**
 * useTrackPageview is a convenience wrapper for tracking a pageview
 * Its metrics will be found at:
 * stack_stats.kibana.plugins.ui_metric.{app}.pageview__{path}(__delayed_{n}ms)?
 */
type TrackPageviewProps = TrackOptions & {
    path: string;
};
export declare function useTrackPageview<Services extends ServiceDeps>({ path, ...rest }: TrackPageviewProps, effectDependencies?: EffectDeps): void;
