export declare const MONITOR_ROUTE = "/monitor/:monitorId?";
export declare const MONITOR_NOT_FOUND_ROUTE = "/monitor-not-found/:monitorId";
export declare const MONITOR_HISTORY_ROUTE = "/monitor/:monitorId/history";
export declare const MONITOR_ERRORS_ROUTE = "/monitor/:monitorId/errors";
export declare const MONITOR_ADD_ROUTE = "/add-monitor";
export declare const MONITOR_EDIT_ROUTE = "/edit-monitor/:monitorId";
export declare const MONITOR_MANAGEMENT_ROUTE = "/manage-monitors";
export declare const OVERVIEW_ROUTE = "/";
export declare const MONITORS_ROUTE = "/monitors";
export declare const GETTING_STARTED_ROUTE = "/monitors/getting-started";
export declare const SETTINGS_ROUTE = "/settings";
export declare const PRIVATE_LOCATIONS_ROUTE = "/settings/private-locations";
export declare const SYNTHETICS_SETTINGS_ROUTE = "/settings/:tabId";
export declare const CERTIFICATES_ROUTE = "/certificates";
export declare const SYNTHETICS_STEP_DETAIL_ROUTE = "/monitor/:monitorId/test-run/:checkGroupId/step/:stepIndex";
export declare const STEP_DETAIL_ROUTE = "/journey/:checkGroupId/step/:stepIndex";
export declare const SYNTHETIC_CHECK_STEPS_ROUTE = "/journey/:checkGroupId/steps";
export declare const TEST_RUN_DETAILS_ROUTE = "/monitor/:monitorId/test-run/:checkGroupId";
export declare const MAPPING_ERROR_ROUTE = "/mapping-error";
export declare const ERROR_DETAILS_ROUTE = "/monitor/:monitorId/errors/:errorStateId";
export declare enum STATUS {
    UP = "up",
    DOWN = "down",
    COMPLETE = "complete",
    FAILED = "failed",
    SKIPPED = "skipped"
}
export declare enum MONITOR_TYPES {
    HTTP = "http",
    TCP = "tcp",
    ICMP = "icmp",
    BROWSER = "browser"
}
export declare const ML_JOB_ID = "high_latency_by_geo";
export declare const ML_MODULE_ID = "uptime_heartbeat";
export declare const UNNAMED_LOCATION = "Unnamed-location";
export declare const SHORT_TS_LOCALE = "en-short-locale";
export declare const SHORT_TIMESPAN_LOCALE: {
    relativeTime: {
        future: string;
        past: string;
        s: string;
        ss: string;
        m: string;
        mm: string;
        h: string;
        hh: string;
        d: string;
        dd: string;
        M: string;
        MM: string;
        y: string;
        yy: string;
    };
};
export declare enum CERT_STATUS {
    OK = "OK",
    EXPIRING_SOON = "EXPIRING_SOON",
    EXPIRED = "EXPIRED",
    TOO_OLD = "TOO_OLD"
}
export declare const KQL_SYNTAX_LOCAL_STORAGE = "xpack.uptime.kql.syntax";
export declare const FILTER_FIELDS: {
    TAGS: string;
    PORT: string;
    LOCATION: string;
    TYPE: string;
};
export declare const SYNTHETICS_INDEX_PATTERN = "synthetics-*";
export declare const LICENSE_NOT_ACTIVE_ERROR = "License not active";
export declare const LICENSE_MISSING_ERROR = "Missing license information";
export declare const LICENSE_NOT_SUPPORTED_ERROR = "License not supported";
export declare const INITIAL_REST_VERSION = "2023-10-31";
