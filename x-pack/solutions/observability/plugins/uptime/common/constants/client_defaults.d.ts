export declare const CLIENT_DEFAULTS: {
    ABSOLUTE_DATE_RANGE_START: number;
    ABSOLUTE_DATE_RANGE_END: number;
    /**
     * The application auto refreshes every 5mins by default.
     */
    AUTOREFRESH_INTERVAL: number;
    /**
     * The application's autorefresh feature is enabled.
     */
    AUTOREFRESH_IS_PAUSED: boolean;
    COMMONLY_USED_DATE_RANGES: {
        start: string;
        end: string;
        label: string;
    }[];
    /**
     * The beginning of the default date range is 15m ago.
     */
    DATE_RANGE_START: string;
    /**
     * The end of the default date range is now.
     */
    DATE_RANGE_END: string;
    FOCUS_CONNECTOR_FIELD: boolean;
    FILTERS: string;
    MONITOR_LIST_PAGE_INDEX: number;
    MONITOR_LIST_PAGE_SIZE: number;
    MONITOR_LIST_SORT_DIRECTION: string;
    MONITOR_LIST_SORT_FIELD: string;
    SEARCH: string;
    STATUS_FILTER: string;
};
export declare const EXCLUDE_RUN_ONCE_FILTER: {
    bool: {
        must_not: {
            exists: {
                field: string;
            };
        };
    };
};
export declare const SUMMARY_FILTER: {
    exists: {
        field: string;
    };
};
export declare const getLocationFilter: ({ locationName, locationId, }: {
    locationName: string;
    locationId: string;
}) => {
    minimum_should_match: number;
    should: ({
        term: {
            'observer.name': string;
            'observer.geo.name'?: undefined;
        };
    } | {
        term: {
            'observer.geo.name': string;
            'observer.name'?: undefined;
        };
    })[];
};
export declare const getTimeSpanFilter: () => {
    range: {
        'monitor.timespan': {
            lte: string;
            gte: string;
        };
    };
};
export declare const getRangeFilter: ({ from, to }: {
    from: string;
    to: string;
}) => {
    range: {
        '@timestamp': {
            gte: string;
            lte: string;
        };
    };
};
