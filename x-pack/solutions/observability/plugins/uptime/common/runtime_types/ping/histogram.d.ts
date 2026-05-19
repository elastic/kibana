export interface HistogramDataPoint {
    upCount?: number;
    downCount?: number;
    x?: number;
    x0?: number;
    y?: number;
}
export interface GetPingHistogramParams {
    dateStart: string;
    dateEnd: string;
    filters?: string;
    monitorId?: string;
    bucketSize?: string;
    query?: string;
    timeZone: string;
}
export interface HistogramResult {
    histogram: HistogramDataPoint[];
    minInterval: number;
}
