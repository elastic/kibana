import * as rt from 'io-ts';
export declare const LOG_ALERTS_CHART_PREVIEW_DATA_PATH = "/api/infra/log_alerts/chart_preview_data";
declare const pointRT: rt.TypeC<{
    timestamp: rt.NumberC;
    value: rt.NumberC;
}>;
export type Point = rt.TypeOf<typeof pointRT>;
declare const seriesRT: rt.ArrayC<rt.TypeC<{
    id: rt.StringC;
    points: rt.ArrayC<rt.TypeC<{
        timestamp: rt.NumberC;
        value: rt.NumberC;
    }>>;
}>>;
export type Series = rt.TypeOf<typeof seriesRT>;
export declare const getLogAlertsChartPreviewDataSuccessResponsePayloadRT: rt.TypeC<{
    data: rt.TypeC<{
        series: rt.ArrayC<rt.TypeC<{
            id: rt.StringC;
            points: rt.ArrayC<rt.TypeC<{
                timestamp: rt.NumberC;
                value: rt.NumberC;
            }>>;
        }>>;
    }>;
}>;
export type GetLogAlertsChartPreviewDataSuccessResponsePayload = rt.TypeOf<typeof getLogAlertsChartPreviewDataSuccessResponsePayloadRT>;
export declare const getLogAlertsChartPreviewDataAlertParamsSubsetRT: any;
export type GetLogAlertsChartPreviewDataAlertParamsSubset = rt.TypeOf<typeof getLogAlertsChartPreviewDataAlertParamsSubsetRT>;
export declare const getLogAlertsChartPreviewDataRequestPayloadRT: rt.TypeC<{
    data: rt.TypeC<{
        logView: rt.TypeC<{
            logViewId: rt.StringC;
            type: rt.LiteralC<"log-view-reference">;
        }>;
        alertParams: any;
        buckets: rt.NumberC;
        executionTimeRange: rt.UnionC<[rt.UndefinedC, rt.TypeC<{
            gte: rt.NumberC;
            lte: rt.NumberC;
        }>]>;
    }>;
}>;
export type GetLogAlertsChartPreviewDataRequestPayload = rt.TypeOf<typeof getLogAlertsChartPreviewDataRequestPayloadRT>;
export {};
