import type { Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { UptimeRouter } from '../types';
import type { UptimeServerSetup, UptimeCorePluginsSetup } from './lib/adapters';
declare const libs: {
    requests: {
        getCerts: import("./lib/adapters").UMElasticsearchQueryFn<{
            pageIndex: number;
        } & {
            search?: string | undefined;
            notValidBefore?: string | undefined;
            notValidAfter?: string | undefined;
            from?: string | undefined;
            to?: string | undefined;
            sortBy?: string | undefined;
            direction?: string | undefined;
            size?: number | undefined;
            filters?: unknown;
            monitorIds?: string[] | undefined;
        }, {
            certs: ({
                monitors: {
                    name?: string | undefined;
                    id?: string | undefined;
                    configId?: string | undefined;
                    url?: string | undefined;
                }[];
                sha256: string;
            } & {
                not_after?: string | undefined;
                not_before?: string | undefined;
                common_name?: string | undefined;
                issuer?: string | undefined;
                sha1?: string | undefined;
                monitorName?: string | undefined;
                monitorType?: string | undefined;
                monitorUrl?: string | undefined;
                locationName?: string | undefined;
            })[];
            total: number;
        }>;
        getIndexPattern: ({ uptimeEsClient, }: {
            uptimeEsClient: import("./lib/lib").UptimeEsClient;
        }) => Promise<import("./lib/requests/get_index_pattern").IndexPatternTitleAndFields | undefined>;
        getLatestMonitor: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_latest_monitor").GetLatestMonitorParams, {
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
        }>;
        getMonitorAvailability: import("./lib/adapters").UMElasticsearchQueryFn<{
            range: number;
            rangeUnit: "y" | "M" | "w" | "d" | "h" | "m" | "s";
            threshold: string;
        } & {
            filters?: string | undefined;
        }, import("./lib/requests/get_monitor_availability").GetMonitorAvailabilityResult[]>;
        getMonitorDurationChart: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_monitor_duration").GetMonitorChartsParams, import("../../common/types").MonitorDurationResult>;
        getMonitorDetails: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_monitor_details").GetMonitorDetailsParams, {
            monitorId: string;
        } & {
            error?: ({
                code?: string | undefined;
                id?: string | undefined;
                stack_trace?: string | undefined;
                type?: string | undefined;
            } & {
                message: string;
            }) | undefined;
            timestamp?: string | undefined;
            alerts?: unknown;
        }>;
        getMonitorLocations: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_monitor_locations").GetMonitorLocationsParams, {
            monitorId: string;
            up_history: number;
            down_history: number;
        } & {
            locations?: {
                up_history: number;
                down_history: number;
                timestamp: string;
                summary: {
                    up?: number | undefined;
                    down?: number | undefined;
                    geo?: ({
                        name: string;
                    } & {
                        location?: {
                            lat: string;
                            lon: string;
                        } | undefined;
                    }) | undefined;
                };
                geo: {
                    name: string;
                } & {
                    location?: {
                        lat: string;
                        lon: string;
                    } | undefined;
                };
            }[] | undefined;
        }>;
        getMonitorStates: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_monitor_states").GetMonitorStatesParams, {
            totalSummaryCount?: number | undefined;
        } & {
            summaries: ({
                monitor_id: string;
                state: {
                    timestamp: string;
                    url: {
                        domain?: string | undefined;
                        full?: string | undefined;
                        path?: string | undefined;
                        port?: number | undefined;
                        scheme?: string | undefined;
                    };
                    summaryPings: ({
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
                    })[];
                    summary: {
                        status?: string | undefined;
                        up?: number | undefined;
                        down?: number | undefined;
                    };
                    monitor: {
                        name?: string | undefined;
                        checkGroup?: string | undefined;
                        duration?: {
                            us: number;
                        } | undefined;
                    } & {
                        type: string;
                    };
                } & {
                    tls?: {
                        not_after?: string | null | undefined;
                        not_before?: string | null | undefined;
                    } | undefined;
                    observer?: {
                        geo: {
                            name: string[];
                        };
                    } | undefined;
                    service?: {
                        name?: string | undefined;
                    } | undefined;
                    error?: ({
                        code?: string | undefined;
                        id?: string | undefined;
                        stack_trace?: string | undefined;
                        type?: string | undefined;
                    } & {
                        message: string;
                    }) | undefined;
                };
            } & {
                histogram?: {
                    points: {
                        timestamp: number;
                        up: number | undefined;
                        down: number | undefined;
                    }[];
                } | undefined;
                minInterval?: number | undefined;
                configId?: string | undefined;
            })[];
            prevPagePagination: string | null;
            nextPagePagination: string | null;
        }>;
        getMonitorStatus: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_monitor_status").GetMonitorStatusParams, import("./lib/requests/get_monitor_status").GetMonitorStatusResult[]>;
        getPings: import("./lib/adapters").UMElasticsearchQueryFn<{
            dateRange: {
                from: string;
                to: string;
            };
        } & {
            excludedLocations?: string | undefined;
            index?: number | undefined;
            size?: number | undefined;
            pageIndex?: number | undefined;
            locations?: string | undefined;
            monitorId?: string | undefined;
            sort?: string | undefined;
            status?: string | undefined;
        }, {
            total: number;
            pings: ({
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
            })[];
        }>;
        getPingHistogram: import("./lib/adapters").UMElasticsearchQueryFn<import("../../common/runtime_types").GetPingHistogramParams, import("../../common/runtime_types").HistogramResult>;
        getSnapshotCount: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_snapshot_counts").GetSnapshotCountParams, {
            down: number;
            total: number;
            up: number;
        }>;
        getIndexStatus: ({ uptimeEsClient, range, }: {
            uptimeEsClient: import("./lib/lib").UptimeEsClient;
            range?: {
                to: string;
                from: string;
            };
        }) => Promise<import("../../common/runtime_types").StatesIndexStatus>;
        getJourneySteps: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_journey_steps").GetJourneyStepsParams, ({
            config_id?: string | undefined;
            monitor?: {
                duration?: {
                    us: number;
                } | undefined;
                name?: string | undefined;
                status?: string | undefined;
                type?: string | undefined;
                timespan?: {
                    gte: string;
                    lt: string;
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
            error?: {
                message: string;
            } | undefined;
        } & {
            _id: string;
            '@timestamp': string;
            monitor: {
                id: string;
                check_group: string;
            };
            synthetics: {
                type: string;
            };
        })[]>;
        getJourneyFailedSteps: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_journey_failed_steps").GetJourneyStepsParams, ({
            config_id?: string | undefined;
            monitor?: {
                duration?: {
                    us: number;
                } | undefined;
                name?: string | undefined;
                status?: string | undefined;
                type?: string | undefined;
                timespan?: {
                    gte: string;
                    lt: string;
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
            error?: {
                message: string;
            } | undefined;
        } & {
            _id: string;
            '@timestamp': string;
            monitor: {
                id: string;
                check_group: string;
            };
            synthetics: {
                type: string;
            };
        })[]>;
        getLastSuccessfulCheck: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_last_successful_check").GetStepScreenshotParams, ({
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
        }) | null>;
        getJourneyScreenshot: import("./lib/adapters").UMElasticsearchQueryFn<{
            checkGroup: string;
            stepIndex: number;
        }, import("./lib/requests/get_journey_screenshot").ScreenshotReturnTypesUnion>;
        getJourneyScreenshotBlocks: import("./lib/adapters").UMElasticsearchQueryFn<{
            blockIds: string[];
        }, {
            id: string;
            synthetics: {
                blob: string;
                blob_mime: string;
            };
        }[]>;
        getJourneyDetails: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_journey_details").GetJourneyDetails, ({
            timestamp: string;
            journey: {
                config_id?: string | undefined;
                monitor?: {
                    duration?: {
                        us: number;
                    } | undefined;
                    name?: string | undefined;
                    status?: string | undefined;
                    type?: string | undefined;
                    timespan?: {
                        gte: string;
                        lt: string;
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
                error?: {
                    message: string;
                } | undefined;
            } & {
                _id: string;
                '@timestamp': string;
                monitor: {
                    id: string;
                    check_group: string;
                };
                synthetics: {
                    type: string;
                };
            };
        } & {
            next?: {
                timestamp: string;
                checkGroup: string;
            } | undefined;
            previous?: {
                timestamp: string;
                checkGroup: string;
            } | undefined;
            summary?: {
                state: {
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
                };
            } | undefined;
        }) | null | undefined>;
        getNetworkEvents: import("./lib/adapters").UMElasticsearchQueryFn<import("./lib/requests/get_network_events").GetNetworkEventsParams, {
            events: import("../../common/runtime_types").NetworkEvent[];
            total: number;
            isWaterfallSupported: boolean;
            hasNavigationRequest: boolean;
        }>;
    };
    license: import("./lib/domains").UMLicenseCheck;
};
export type UMServerLibs = typeof libs;
export declare const initUptimeServer: (server: UptimeServerSetup, plugins: UptimeCorePluginsSetup, ruleDataClient: IRuleDataClient, logger: Logger, router: UptimeRouter) => void;
export {};
