import type { PromiseType } from 'utility-types';
import type { UMElasticsearchQueryFn } from '../adapters';
import type { CertResult, GetCertsParams } from '../../../../common/runtime_types';
import type { UptimeEsClient } from '../lib';
export declare const getCerts: UMElasticsearchQueryFn<GetCertsParams, CertResult>;
export type CertificatesResults = PromiseType<ReturnType<typeof getCertsResults>>;
declare const getCertsResults: (requestParams: GetCertsParams & {
    uptimeEsClient: UptimeEsClient;
}) => Promise<import("@kbn/es-types").ESSearchResponse<{
    timestamp: string;
    monitor: {
        id: string;
        status: string;
        type: string;
        check_group: string;
    } & {
        duration?: {
            us: number;
        } | undefined;
        ip?: string | undefined;
        name?: string | undefined;
        timespan?: {
            gte: string;
            lt: string;
        } | undefined;
        fleet_managed?: boolean | undefined;
        project?: {
            id: string;
            name: string;
        } | undefined;
    };
    docId: string;
} & {
    agent?: ({
        ephemeral_id: string;
        id: string;
        type: string;
        version: string;
    } & {
        name?: string | undefined;
        hostname?: string | undefined;
    }) | undefined;
    container?: {
        id?: string | undefined;
        image?: {
            name?: string | undefined;
            tag?: string | undefined;
        } | undefined;
        name?: string | undefined;
        runtime?: string | undefined;
    } | undefined;
    ecs?: {
        version?: string | undefined;
    } | undefined;
    error?: ({
        code?: string | undefined;
        id?: string | undefined;
        stack_trace?: string | undefined;
        type?: string | undefined;
    } & {
        message: string;
    }) | undefined;
    http?: {
        request?: {
            body?: {
                bytes?: number | undefined;
                content?: {
                    text?: string | undefined;
                } | undefined;
            } | undefined;
            bytes?: number | undefined;
            method?: string | undefined;
            referrer?: string | undefined;
        } | undefined;
        response?: {
            body?: {
                bytes?: number | undefined;
                content?: string | undefined;
                content_bytes?: number | undefined;
                hash?: string | undefined;
            } | undefined;
            bytes?: number | undefined;
            redirects?: string[] | undefined;
            status_code?: number | undefined;
            headers?: {
                [x: string]: string | string[];
            } | undefined;
        } | undefined;
        version?: string | undefined;
    } | undefined;
    icmp?: {
        requests?: number | undefined;
        rtt?: {
            us?: number | undefined;
        } | undefined;
    } | undefined;
    kubernetes?: {
        pod?: {
            name?: string | undefined;
            uid?: string | undefined;
        } | undefined;
    } | undefined;
    observer?: {
        hostname?: string | undefined;
        ip?: string[] | undefined;
        mac?: string[] | undefined;
        name?: string | undefined;
        geo?: {
            name?: string | undefined;
            continent_name?: string | undefined;
            city_name?: string | undefined;
            country_iso_code?: string | undefined;
            location?: string | {
                lat?: number | undefined;
                lon?: number | undefined;
            } | {
                lat?: string | undefined;
                lon?: string | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    resolve?: {
        ip?: string | undefined;
        rtt?: {
            us?: number | undefined;
        } | undefined;
    } | undefined;
    summary?: {
        down?: number | undefined;
        up?: number | undefined;
    } | undefined;
    synthetics?: {
        index?: number | undefined;
        journey?: {
            id: string;
            name: string;
        } | undefined;
        error?: {
            message?: string | undefined;
            name?: string | undefined;
            stack?: string | undefined;
        } | undefined;
        package_version?: string | undefined;
        step?: {
            status: string;
            index: number;
            name: string;
            duration: {
                us: number;
            };
        } | undefined;
        type?: string | undefined;
        blob?: string | undefined;
        blob_mime?: string | undefined;
        payload?: {
            duration?: number | undefined;
            index?: number | undefined;
            is_navigation_request?: boolean | undefined;
            message?: string | undefined;
            method?: string | undefined;
            name?: string | undefined;
            params?: {
                homepage?: string | undefined;
            } | undefined;
            source?: string | undefined;
            start?: number | undefined;
            status?: string | undefined;
            ts?: number | undefined;
            type?: string | undefined;
            url?: string | undefined;
            end?: number | undefined;
            text?: string | undefined;
        } | undefined;
        isFullScreenshot?: boolean | undefined;
        isScreenshotRef?: boolean | undefined;
    } | undefined;
    tags?: string[] | undefined;
    tcp?: {
        rtt?: {
            connect?: {
                us?: number | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    tls?: {
        cipher?: string | undefined;
        established?: boolean | undefined;
        server?: {
            hash?: {
                sha256: string;
                sha1: string;
            } | undefined;
            x509?: ({
                issuer: {
                    common_name: string;
                    distinguished_name: string;
                };
                subject: {
                    common_name: string;
                    distinguished_name: string;
                };
                serial_number: string;
                public_key_algorithm: string;
                signature_algorithm: string;
            } & {
                not_after: string;
                not_before: string;
            } & {
                public_key_curve?: string | undefined;
                public_key_exponent?: number | undefined;
                public_key_size?: number | undefined;
            }) | undefined;
        } | undefined;
    } | undefined;
    url?: {
        domain?: string | undefined;
        full?: string | undefined;
        port?: number | undefined;
        scheme?: string | undefined;
        path?: string | undefined;
    } | undefined;
    service?: {
        name?: string | undefined;
    } | undefined;
    config_id?: string | undefined;
    state?: {
        duration_ms: string | number;
        checks: number;
        ends: {
            duration_ms: string | number;
            checks: number;
            ends: string | null;
            started_at: string;
            id: string;
            up: number;
            down: number;
            status: string;
        } | null;
        started_at: string;
        id: string;
        up: number;
        down: number;
        status: string;
    } | undefined;
    data_stream?: {
        namespace: string;
        type: string;
        dataset: string;
    } | undefined;
}, {
    from: number;
    size: number;
    sort: import("@elastic/elasticsearch/lib/api/types").SortCombinations[];
    query: {
        bool: {
            filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer;
            minimum_should_match?: number | undefined;
            should?: {
                multi_match: {
                    query: string;
                    type: "phrase_prefix";
                    fields: string[];
                };
            }[] | undefined;
        };
    };
    _source: string[];
    collapse: {
        field: string;
        inner_hits: {
            _source: {
                includes: string[];
            };
            collapse: {
                field: string;
            };
            name: string;
            sort: {
                'monitor.id': "asc";
            }[];
        };
    };
    aggs: {
        total: {
            cardinality: {
                field: string;
            };
        };
    };
}>>;
export {};
