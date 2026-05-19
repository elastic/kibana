import * as t from 'io-ts';
export declare const StateType: t.IntersectionC<[t.TypeC<{
    timestamp: t.StringC;
    url: t.PartialC<{
        domain: t.StringC;
        full: t.StringC;
        path: t.StringC;
        port: t.NumberC;
        scheme: t.StringC;
    }>;
    summaryPings: t.ArrayC<t.IntersectionC<[t.TypeC<{
        timestamp: t.StringC;
        monitor: t.IntersectionC<[t.TypeC<{
            id: t.StringC;
            status: t.StringC;
            type: t.StringC;
            check_group: t.StringC;
        }>, t.PartialC<{
            duration: t.TypeC<{
                us: t.NumberC;
            }>;
            ip: t.StringC;
            name: t.StringC;
            timespan: t.TypeC<{
                gte: t.StringC;
                lt: t.StringC;
            }>;
            fleet_managed: t.BooleanC;
            project: t.TypeC<{
                id: t.StringC;
                name: t.StringC;
            }>;
        }>]>;
        docId: t.StringC;
    }>, t.PartialC<{
        agent: t.IntersectionC<[t.TypeC<{
            ephemeral_id: t.StringC;
            id: t.StringC;
            type: t.StringC;
            version: t.StringC;
        }>, t.PartialC<{
            name: t.StringC;
            hostname: t.StringC;
        }>]>;
        container: t.PartialC<{
            id: t.StringC;
            image: t.PartialC<{
                name: t.StringC;
                tag: t.StringC;
            }>;
            name: t.StringC;
            runtime: t.StringC;
        }>;
        ecs: t.PartialC<{
            version: t.StringC;
        }>;
        error: t.IntersectionC<[t.PartialC<{
            code: t.StringC;
            id: t.StringC;
            stack_trace: t.StringC;
            type: t.StringC;
        }>, t.TypeC<{
            message: t.StringC;
        }>]>;
        http: t.PartialC<{
            request: t.PartialC<{
                body: t.PartialC<{
                    bytes: t.NumberC;
                    content: t.PartialC<{
                        text: t.StringC;
                    }>;
                }>;
                bytes: t.NumberC;
                method: t.StringC;
                referrer: t.StringC;
            }>;
            response: t.PartialC<{
                body: t.PartialC<{
                    bytes: t.NumberC;
                    content: t.StringC;
                    content_bytes: t.NumberC;
                    hash: t.StringC;
                }>;
                bytes: t.NumberC;
                redirects: t.ArrayC<t.StringC>;
                status_code: t.NumberC;
                headers: t.RecordC<t.StringC, t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>>;
            }>;
            version: t.StringC;
        }>;
        icmp: t.PartialC<{
            requests: t.NumberC;
            rtt: t.PartialC<{
                us: t.NumberC;
            }>;
        }>;
        kubernetes: t.PartialC<{
            pod: t.PartialC<{
                name: t.StringC;
                uid: t.StringC;
            }>;
        }>;
        observer: t.PartialC<{
            hostname: t.StringC;
            ip: t.ArrayC<t.StringC>;
            mac: t.ArrayC<t.StringC>;
            name: t.UnionC<[t.StringC, t.UndefinedC]>;
            geo: t.PartialC<{
                name: t.StringC;
                continent_name: t.StringC;
                city_name: t.StringC;
                country_iso_code: t.StringC;
                location: t.UnionC<[t.StringC, t.PartialC<{
                    lat: t.NumberC;
                    lon: t.NumberC;
                }>, t.PartialC<{
                    lat: t.StringC;
                    lon: t.StringC;
                }>]>;
            }>;
        }>;
        resolve: t.PartialC<{
            ip: t.StringC;
            rtt: t.PartialC<{
                us: t.NumberC;
            }>;
        }>;
        summary: t.PartialC<{
            down: t.NumberC;
            up: t.NumberC;
        }>;
        synthetics: t.PartialC<{
            index: t.NumberC;
            journey: t.TypeC<{
                id: t.StringC;
                name: t.StringC;
            }>;
            error: t.PartialC<{
                message: t.StringC;
                name: t.StringC;
                stack: t.StringC;
            }>;
            package_version: t.StringC;
            step: t.TypeC<{
                status: t.StringC;
                index: t.NumberC;
                name: t.StringC;
                duration: t.TypeC<{
                    us: t.NumberC;
                }>;
            }>;
            type: t.StringC;
            blob: t.StringC;
            blob_mime: t.StringC;
            payload: t.PartialC<{
                duration: t.NumberC;
                index: t.NumberC;
                is_navigation_request: t.BooleanC;
                message: t.StringC;
                method: t.StringC;
                name: t.StringC;
                params: t.PartialC<{
                    homepage: t.StringC;
                }>;
                source: t.StringC;
                start: t.NumberC;
                status: t.StringC;
                ts: t.NumberC;
                type: t.StringC;
                url: t.StringC;
                end: t.NumberC;
                text: t.StringC;
            }>;
            isFullScreenshot: t.BooleanC;
            isScreenshotRef: t.BooleanC;
        }>;
        tags: t.ArrayC<t.StringC>;
        tcp: t.PartialC<{
            rtt: t.PartialC<{
                connect: t.PartialC<{
                    us: t.NumberC;
                }>;
            }>;
        }>;
        tls: t.PartialC<{
            cipher: t.StringC;
            established: t.BooleanC;
            server: t.PartialC<{
                hash: t.TypeC<{
                    sha256: t.StringC;
                    sha1: t.StringC;
                }>;
                x509: t.IntersectionC<[t.TypeC<{
                    issuer: t.TypeC<{
                        common_name: t.StringC;
                        distinguished_name: t.StringC;
                    }>;
                    subject: t.TypeC<{
                        common_name: t.StringC;
                        distinguished_name: t.StringC;
                    }>;
                    serial_number: t.StringC;
                    public_key_algorithm: t.StringC;
                    signature_algorithm: t.StringC;
                }>, t.TypeC<{
                    not_after: t.StringC;
                    not_before: t.StringC;
                }>, t.PartialC<{
                    public_key_curve: t.StringC;
                    public_key_exponent: t.NumberC;
                    public_key_size: t.NumberC;
                }>]>;
            }>;
        }>;
        url: t.PartialC<{
            domain: t.StringC;
            full: t.StringC;
            port: t.NumberC;
            scheme: t.StringC;
            path: t.StringC;
        }>;
        service: t.PartialC<{
            name: t.StringC;
        }>;
        config_id: t.StringC;
        state: t.TypeC<{
            duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
            checks: t.NumberC;
            ends: t.UnionC<[t.TypeC<{
                duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
                checks: t.NumberC;
                ends: t.UnionC<[t.StringC, t.NullC]>;
                started_at: t.StringC;
                id: t.StringC;
                up: t.NumberC;
                down: t.NumberC;
                status: t.StringC;
            }>, t.NullC]>;
            started_at: t.StringC;
            id: t.StringC;
            up: t.NumberC;
            down: t.NumberC;
            status: t.StringC;
        }>;
        data_stream: t.TypeC<{
            namespace: t.StringC;
            type: t.StringC;
            dataset: t.StringC;
        }>;
    }>]>>;
    summary: t.PartialC<{
        status: t.StringC;
        up: t.NumberC;
        down: t.NumberC;
    }>;
    monitor: t.IntersectionC<[t.PartialC<{
        name: t.StringC;
        checkGroup: t.StringC;
        duration: t.TypeC<{
            us: t.NumberC;
        }>;
    }>, t.TypeC<{
        type: t.StringC;
    }>]>;
}>, t.PartialC<{
    tls: t.PartialC<{
        not_after: t.UnionC<[t.StringC, t.NullC]>;
        not_before: t.UnionC<[t.StringC, t.NullC]>;
    }>;
    observer: t.TypeC<{
        geo: t.TypeC<{
            name: t.ArrayC<t.StringC>;
        }>;
    }>;
    service: t.PartialC<{
        name: t.StringC;
    }>;
    error: t.IntersectionC<[t.PartialC<{
        code: t.StringC;
        id: t.StringC;
        stack_trace: t.StringC;
        type: t.StringC;
    }>, t.TypeC<{
        message: t.StringC;
    }>]>;
}>]>;
export type MonitorSummaryState = t.TypeOf<typeof StateType>;
export declare const HistogramPointType: t.TypeC<{
    timestamp: t.NumberC;
    up: t.UnionC<[t.NumberC, t.UndefinedC]>;
    down: t.UnionC<[t.NumberC, t.UndefinedC]>;
}>;
export type HistogramPoint = t.TypeOf<typeof HistogramPointType>;
export declare const HistogramType: t.TypeC<{
    points: t.ArrayC<t.TypeC<{
        timestamp: t.NumberC;
        up: t.UnionC<[t.NumberC, t.UndefinedC]>;
        down: t.UnionC<[t.NumberC, t.UndefinedC]>;
    }>>;
}>;
export type Histogram = t.TypeOf<typeof HistogramType>;
export declare const MonitorSummaryType: t.IntersectionC<[t.TypeC<{
    monitor_id: t.StringC;
    state: t.IntersectionC<[t.TypeC<{
        timestamp: t.StringC;
        url: t.PartialC<{
            domain: t.StringC;
            full: t.StringC;
            path: t.StringC;
            port: t.NumberC;
            scheme: t.StringC;
        }>;
        summaryPings: t.ArrayC<t.IntersectionC<[t.TypeC<{
            timestamp: t.StringC;
            monitor: t.IntersectionC<[t.TypeC<{
                id: t.StringC;
                status: t.StringC;
                type: t.StringC;
                check_group: t.StringC;
            }>, t.PartialC<{
                duration: t.TypeC<{
                    us: t.NumberC;
                }>;
                ip: t.StringC;
                name: t.StringC;
                timespan: t.TypeC<{
                    gte: t.StringC;
                    lt: t.StringC;
                }>;
                fleet_managed: t.BooleanC;
                project: t.TypeC<{
                    id: t.StringC;
                    name: t.StringC;
                }>;
            }>]>;
            docId: t.StringC;
        }>, t.PartialC<{
            agent: t.IntersectionC<[t.TypeC<{
                ephemeral_id: t.StringC;
                id: t.StringC;
                type: t.StringC;
                version: t.StringC;
            }>, t.PartialC<{
                name: t.StringC;
                hostname: t.StringC;
            }>]>;
            container: t.PartialC<{
                id: t.StringC;
                image: t.PartialC<{
                    name: t.StringC;
                    tag: t.StringC;
                }>;
                name: t.StringC;
                runtime: t.StringC;
            }>;
            ecs: t.PartialC<{
                version: t.StringC;
            }>;
            error: t.IntersectionC<[t.PartialC<{
                code: t.StringC;
                id: t.StringC;
                stack_trace: t.StringC;
                type: t.StringC;
            }>, t.TypeC<{
                message: t.StringC;
            }>]>;
            http: t.PartialC<{
                request: t.PartialC<{
                    body: t.PartialC<{
                        bytes: t.NumberC;
                        content: t.PartialC<{
                            text: t.StringC;
                        }>;
                    }>;
                    bytes: t.NumberC;
                    method: t.StringC;
                    referrer: t.StringC;
                }>;
                response: t.PartialC<{
                    body: t.PartialC<{
                        bytes: t.NumberC;
                        content: t.StringC;
                        content_bytes: t.NumberC;
                        hash: t.StringC;
                    }>;
                    bytes: t.NumberC;
                    redirects: t.ArrayC<t.StringC>;
                    status_code: t.NumberC;
                    headers: t.RecordC<t.StringC, t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>>;
                }>;
                version: t.StringC;
            }>;
            icmp: t.PartialC<{
                requests: t.NumberC;
                rtt: t.PartialC<{
                    us: t.NumberC;
                }>;
            }>;
            kubernetes: t.PartialC<{
                pod: t.PartialC<{
                    name: t.StringC;
                    uid: t.StringC;
                }>;
            }>;
            observer: t.PartialC<{
                hostname: t.StringC;
                ip: t.ArrayC<t.StringC>;
                mac: t.ArrayC<t.StringC>;
                name: t.UnionC<[t.StringC, t.UndefinedC]>;
                geo: t.PartialC<{
                    name: t.StringC;
                    continent_name: t.StringC;
                    city_name: t.StringC;
                    country_iso_code: t.StringC;
                    location: t.UnionC<[t.StringC, t.PartialC<{
                        lat: t.NumberC;
                        lon: t.NumberC;
                    }>, t.PartialC<{
                        lat: t.StringC;
                        lon: t.StringC;
                    }>]>;
                }>;
            }>;
            resolve: t.PartialC<{
                ip: t.StringC;
                rtt: t.PartialC<{
                    us: t.NumberC;
                }>;
            }>;
            summary: t.PartialC<{
                down: t.NumberC;
                up: t.NumberC;
            }>;
            synthetics: t.PartialC<{
                index: t.NumberC;
                journey: t.TypeC<{
                    id: t.StringC;
                    name: t.StringC;
                }>;
                error: t.PartialC<{
                    message: t.StringC;
                    name: t.StringC;
                    stack: t.StringC;
                }>;
                package_version: t.StringC;
                step: t.TypeC<{
                    status: t.StringC;
                    index: t.NumberC;
                    name: t.StringC;
                    duration: t.TypeC<{
                        us: t.NumberC;
                    }>;
                }>;
                type: t.StringC;
                blob: t.StringC;
                blob_mime: t.StringC;
                payload: t.PartialC<{
                    duration: t.NumberC;
                    index: t.NumberC;
                    is_navigation_request: t.BooleanC;
                    message: t.StringC;
                    method: t.StringC;
                    name: t.StringC;
                    params: t.PartialC<{
                        homepage: t.StringC;
                    }>;
                    source: t.StringC;
                    start: t.NumberC;
                    status: t.StringC;
                    ts: t.NumberC;
                    type: t.StringC;
                    url: t.StringC;
                    end: t.NumberC;
                    text: t.StringC;
                }>;
                isFullScreenshot: t.BooleanC;
                isScreenshotRef: t.BooleanC;
            }>;
            tags: t.ArrayC<t.StringC>;
            tcp: t.PartialC<{
                rtt: t.PartialC<{
                    connect: t.PartialC<{
                        us: t.NumberC;
                    }>;
                }>;
            }>;
            tls: t.PartialC<{
                cipher: t.StringC;
                established: t.BooleanC;
                server: t.PartialC<{
                    hash: t.TypeC<{
                        sha256: t.StringC;
                        sha1: t.StringC;
                    }>;
                    x509: t.IntersectionC<[t.TypeC<{
                        issuer: t.TypeC<{
                            common_name: t.StringC;
                            distinguished_name: t.StringC;
                        }>;
                        subject: t.TypeC<{
                            common_name: t.StringC;
                            distinguished_name: t.StringC;
                        }>;
                        serial_number: t.StringC;
                        public_key_algorithm: t.StringC;
                        signature_algorithm: t.StringC;
                    }>, t.TypeC<{
                        not_after: t.StringC;
                        not_before: t.StringC;
                    }>, t.PartialC<{
                        public_key_curve: t.StringC;
                        public_key_exponent: t.NumberC;
                        public_key_size: t.NumberC;
                    }>]>;
                }>;
            }>;
            url: t.PartialC<{
                domain: t.StringC;
                full: t.StringC;
                port: t.NumberC;
                scheme: t.StringC;
                path: t.StringC;
            }>;
            service: t.PartialC<{
                name: t.StringC;
            }>;
            config_id: t.StringC;
            state: t.TypeC<{
                duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
                checks: t.NumberC;
                ends: t.UnionC<[t.TypeC<{
                    duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
                    checks: t.NumberC;
                    ends: t.UnionC<[t.StringC, t.NullC]>;
                    started_at: t.StringC;
                    id: t.StringC;
                    up: t.NumberC;
                    down: t.NumberC;
                    status: t.StringC;
                }>, t.NullC]>;
                started_at: t.StringC;
                id: t.StringC;
                up: t.NumberC;
                down: t.NumberC;
                status: t.StringC;
            }>;
            data_stream: t.TypeC<{
                namespace: t.StringC;
                type: t.StringC;
                dataset: t.StringC;
            }>;
        }>]>>;
        summary: t.PartialC<{
            status: t.StringC;
            up: t.NumberC;
            down: t.NumberC;
        }>;
        monitor: t.IntersectionC<[t.PartialC<{
            name: t.StringC;
            checkGroup: t.StringC;
            duration: t.TypeC<{
                us: t.NumberC;
            }>;
        }>, t.TypeC<{
            type: t.StringC;
        }>]>;
    }>, t.PartialC<{
        tls: t.PartialC<{
            not_after: t.UnionC<[t.StringC, t.NullC]>;
            not_before: t.UnionC<[t.StringC, t.NullC]>;
        }>;
        observer: t.TypeC<{
            geo: t.TypeC<{
                name: t.ArrayC<t.StringC>;
            }>;
        }>;
        service: t.PartialC<{
            name: t.StringC;
        }>;
        error: t.IntersectionC<[t.PartialC<{
            code: t.StringC;
            id: t.StringC;
            stack_trace: t.StringC;
            type: t.StringC;
        }>, t.TypeC<{
            message: t.StringC;
        }>]>;
    }>]>;
}>, t.PartialC<{
    histogram: t.TypeC<{
        points: t.ArrayC<t.TypeC<{
            timestamp: t.NumberC;
            up: t.UnionC<[t.NumberC, t.UndefinedC]>;
            down: t.UnionC<[t.NumberC, t.UndefinedC]>;
        }>>;
    }>;
    minInterval: t.NumberC;
    configId: t.StringC;
}>]>;
export type MonitorSummary = t.TypeOf<typeof MonitorSummaryType>;
export declare const MonitorSummariesResultType: t.IntersectionC<[t.PartialC<{
    totalSummaryCount: t.NumberC;
}>, t.TypeC<{
    summaries: t.ArrayC<t.IntersectionC<[t.TypeC<{
        monitor_id: t.StringC;
        state: t.IntersectionC<[t.TypeC<{
            timestamp: t.StringC;
            url: t.PartialC<{
                domain: t.StringC;
                full: t.StringC;
                path: t.StringC;
                port: t.NumberC;
                scheme: t.StringC;
            }>;
            summaryPings: t.ArrayC<t.IntersectionC<[t.TypeC<{
                timestamp: t.StringC;
                monitor: t.IntersectionC<[t.TypeC<{
                    id: t.StringC;
                    status: t.StringC;
                    type: t.StringC;
                    check_group: t.StringC;
                }>, t.PartialC<{
                    duration: t.TypeC<{
                        us: t.NumberC;
                    }>;
                    ip: t.StringC;
                    name: t.StringC;
                    timespan: t.TypeC<{
                        gte: t.StringC;
                        lt: t.StringC;
                    }>;
                    fleet_managed: t.BooleanC;
                    project: t.TypeC<{
                        id: t.StringC;
                        name: t.StringC;
                    }>;
                }>]>;
                docId: t.StringC;
            }>, t.PartialC<{
                agent: t.IntersectionC<[t.TypeC<{
                    ephemeral_id: t.StringC;
                    id: t.StringC;
                    type: t.StringC;
                    version: t.StringC;
                }>, t.PartialC<{
                    name: t.StringC;
                    hostname: t.StringC;
                }>]>;
                container: t.PartialC<{
                    id: t.StringC;
                    image: t.PartialC<{
                        name: t.StringC;
                        tag: t.StringC;
                    }>;
                    name: t.StringC;
                    runtime: t.StringC;
                }>;
                ecs: t.PartialC<{
                    version: t.StringC;
                }>;
                error: t.IntersectionC<[t.PartialC<{
                    code: t.StringC;
                    id: t.StringC;
                    stack_trace: t.StringC;
                    type: t.StringC;
                }>, t.TypeC<{
                    message: t.StringC;
                }>]>;
                http: t.PartialC<{
                    request: t.PartialC<{
                        body: t.PartialC<{
                            bytes: t.NumberC;
                            content: t.PartialC<{
                                text: t.StringC;
                            }>;
                        }>;
                        bytes: t.NumberC;
                        method: t.StringC;
                        referrer: t.StringC;
                    }>;
                    response: t.PartialC<{
                        body: t.PartialC<{
                            bytes: t.NumberC;
                            content: t.StringC;
                            content_bytes: t.NumberC;
                            hash: t.StringC;
                        }>;
                        bytes: t.NumberC;
                        redirects: t.ArrayC<t.StringC>;
                        status_code: t.NumberC;
                        headers: t.RecordC<t.StringC, t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>>;
                    }>;
                    version: t.StringC;
                }>;
                icmp: t.PartialC<{
                    requests: t.NumberC;
                    rtt: t.PartialC<{
                        us: t.NumberC;
                    }>;
                }>;
                kubernetes: t.PartialC<{
                    pod: t.PartialC<{
                        name: t.StringC;
                        uid: t.StringC;
                    }>;
                }>;
                observer: t.PartialC<{
                    hostname: t.StringC;
                    ip: t.ArrayC<t.StringC>;
                    mac: t.ArrayC<t.StringC>;
                    name: t.UnionC<[t.StringC, t.UndefinedC]>;
                    geo: t.PartialC<{
                        name: t.StringC;
                        continent_name: t.StringC;
                        city_name: t.StringC;
                        country_iso_code: t.StringC;
                        location: t.UnionC<[t.StringC, t.PartialC<{
                            lat: t.NumberC;
                            lon: t.NumberC;
                        }>, t.PartialC<{
                            lat: t.StringC;
                            lon: t.StringC;
                        }>]>;
                    }>;
                }>;
                resolve: t.PartialC<{
                    ip: t.StringC;
                    rtt: t.PartialC<{
                        us: t.NumberC;
                    }>;
                }>;
                summary: t.PartialC<{
                    down: t.NumberC;
                    up: t.NumberC;
                }>;
                synthetics: t.PartialC<{
                    index: t.NumberC;
                    journey: t.TypeC<{
                        id: t.StringC;
                        name: t.StringC;
                    }>;
                    error: t.PartialC<{
                        message: t.StringC;
                        name: t.StringC;
                        stack: t.StringC;
                    }>;
                    package_version: t.StringC;
                    step: t.TypeC<{
                        status: t.StringC;
                        index: t.NumberC;
                        name: t.StringC;
                        duration: t.TypeC<{
                            us: t.NumberC;
                        }>;
                    }>;
                    type: t.StringC;
                    blob: t.StringC;
                    blob_mime: t.StringC;
                    payload: t.PartialC<{
                        duration: t.NumberC;
                        index: t.NumberC;
                        is_navigation_request: t.BooleanC;
                        message: t.StringC;
                        method: t.StringC;
                        name: t.StringC;
                        params: t.PartialC<{
                            homepage: t.StringC;
                        }>;
                        source: t.StringC;
                        start: t.NumberC;
                        status: t.StringC;
                        ts: t.NumberC;
                        type: t.StringC;
                        url: t.StringC;
                        end: t.NumberC;
                        text: t.StringC;
                    }>;
                    isFullScreenshot: t.BooleanC;
                    isScreenshotRef: t.BooleanC;
                }>;
                tags: t.ArrayC<t.StringC>;
                tcp: t.PartialC<{
                    rtt: t.PartialC<{
                        connect: t.PartialC<{
                            us: t.NumberC;
                        }>;
                    }>;
                }>;
                tls: t.PartialC<{
                    cipher: t.StringC;
                    established: t.BooleanC;
                    server: t.PartialC<{
                        hash: t.TypeC<{
                            sha256: t.StringC;
                            sha1: t.StringC;
                        }>;
                        x509: t.IntersectionC<[t.TypeC<{
                            issuer: t.TypeC<{
                                common_name: t.StringC;
                                distinguished_name: t.StringC;
                            }>;
                            subject: t.TypeC<{
                                common_name: t.StringC;
                                distinguished_name: t.StringC;
                            }>;
                            serial_number: t.StringC;
                            public_key_algorithm: t.StringC;
                            signature_algorithm: t.StringC;
                        }>, t.TypeC<{
                            not_after: t.StringC;
                            not_before: t.StringC;
                        }>, t.PartialC<{
                            public_key_curve: t.StringC;
                            public_key_exponent: t.NumberC;
                            public_key_size: t.NumberC;
                        }>]>;
                    }>;
                }>;
                url: t.PartialC<{
                    domain: t.StringC;
                    full: t.StringC;
                    port: t.NumberC;
                    scheme: t.StringC;
                    path: t.StringC;
                }>;
                service: t.PartialC<{
                    name: t.StringC;
                }>;
                config_id: t.StringC;
                state: t.TypeC<{
                    duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
                    checks: t.NumberC;
                    ends: t.UnionC<[t.TypeC<{
                        duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
                        checks: t.NumberC;
                        ends: t.UnionC<[t.StringC, t.NullC]>;
                        started_at: t.StringC;
                        id: t.StringC;
                        up: t.NumberC;
                        down: t.NumberC;
                        status: t.StringC;
                    }>, t.NullC]>;
                    started_at: t.StringC;
                    id: t.StringC;
                    up: t.NumberC;
                    down: t.NumberC;
                    status: t.StringC;
                }>;
                data_stream: t.TypeC<{
                    namespace: t.StringC;
                    type: t.StringC;
                    dataset: t.StringC;
                }>;
            }>]>>;
            summary: t.PartialC<{
                status: t.StringC;
                up: t.NumberC;
                down: t.NumberC;
            }>;
            monitor: t.IntersectionC<[t.PartialC<{
                name: t.StringC;
                checkGroup: t.StringC;
                duration: t.TypeC<{
                    us: t.NumberC;
                }>;
            }>, t.TypeC<{
                type: t.StringC;
            }>]>;
        }>, t.PartialC<{
            tls: t.PartialC<{
                not_after: t.UnionC<[t.StringC, t.NullC]>;
                not_before: t.UnionC<[t.StringC, t.NullC]>;
            }>;
            observer: t.TypeC<{
                geo: t.TypeC<{
                    name: t.ArrayC<t.StringC>;
                }>;
            }>;
            service: t.PartialC<{
                name: t.StringC;
            }>;
            error: t.IntersectionC<[t.PartialC<{
                code: t.StringC;
                id: t.StringC;
                stack_trace: t.StringC;
                type: t.StringC;
            }>, t.TypeC<{
                message: t.StringC;
            }>]>;
        }>]>;
    }>, t.PartialC<{
        histogram: t.TypeC<{
            points: t.ArrayC<t.TypeC<{
                timestamp: t.NumberC;
                up: t.UnionC<[t.NumberC, t.UndefinedC]>;
                down: t.UnionC<[t.NumberC, t.UndefinedC]>;
            }>>;
        }>;
        minInterval: t.NumberC;
        configId: t.StringC;
    }>]>>;
    prevPagePagination: t.UnionC<[t.StringC, t.NullC]>;
    nextPagePagination: t.UnionC<[t.StringC, t.NullC]>;
}>]>;
export type MonitorSummariesResult = t.TypeOf<typeof MonitorSummariesResultType>;
export declare const FetchMonitorStatesQueryArgsType: t.IntersectionC<[t.PartialC<{
    pagination: t.StringC;
    filters: t.StringC;
    statusFilter: t.StringC;
    query: t.StringC;
}>, t.TypeC<{
    dateRangeStart: t.StringC;
    dateRangeEnd: t.StringC;
    pageSize: t.NumberC;
}>]>;
export type FetchMonitorStatesQueryArgs = t.TypeOf<typeof FetchMonitorStatesQueryArgsType>;
export declare enum CursorDirection {
    AFTER = "AFTER",
    BEFORE = "BEFORE"
}
export declare enum SortOrder {
    ASC = "ASC",
    DESC = "DESC"
}
