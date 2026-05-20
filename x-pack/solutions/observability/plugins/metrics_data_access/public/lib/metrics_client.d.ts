import type { HttpStart } from '@kbn/core/public';
import type { MetricsExplorerRequestBody } from '../../common/http_api/metrics_explorer';
export declare class MetricsDataClient {
    private readonly http;
    constructor(http: HttpStart);
    metricsExplorer(body: MetricsExplorerRequestBody): Promise<{
        series: ({
            id: string;
            columns: {
                name: string;
                type: "string" | "number" | "date";
            }[];
            rows: ({
                timestamp: number;
            } & {
                [x: string]: string | number | object[] | null | undefined;
            })[];
        } & {
            keys?: string[] | undefined;
        })[];
        pageInfo: {
            total: number;
            afterKey: string | {
                [x: string]: string | null;
            } | null;
        };
    }>;
    metricsIndices(): Promise<{
        metricIndices: string;
        metricIndicesExist: boolean;
    }>;
}
