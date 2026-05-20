import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
export declare const useEBTTelemetry: ({ analytics, queryName, }: {
    analytics?: AnalyticsServiceSetup;
    queryName?: string;
}) => {
    reportEvent: (inspectorAdapters?: Partial<DefaultInspectorAdapters>) => void;
};
