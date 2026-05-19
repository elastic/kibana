export declare const format: ({ pathname, query, }: {
    pathname: string;
    query: Record<string, any>;
}) => string;
export declare const getMonitorRouteFromMonitorId: ({ monitorId, dateRangeStart, dateRangeEnd, filters, }: {
    monitorId: string;
    dateRangeStart: string;
    dateRangeEnd: string;
    filters?: Record<string, string[]>;
}) => string;
