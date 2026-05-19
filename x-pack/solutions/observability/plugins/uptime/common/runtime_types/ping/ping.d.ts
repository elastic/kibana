import * as t from 'io-ts';
export declare const PingErrorType: t.IntersectionC<[t.PartialC<{
    code: t.StringC;
    id: t.StringC;
    stack_trace: t.StringC;
    type: t.StringC;
}>, t.TypeC<{
    message: t.StringC;
}>]>;
export type PingError = t.TypeOf<typeof PingErrorType>;
export declare const MonitorDetailsType: t.IntersectionC<[t.TypeC<{
    monitorId: t.StringC;
}>, t.PartialC<{
    error: t.IntersectionC<[t.PartialC<{
        code: t.StringC;
        id: t.StringC;
        stack_trace: t.StringC;
        type: t.StringC;
    }>, t.TypeC<{
        message: t.StringC;
    }>]>;
    timestamp: t.StringC;
    alerts: t.UnknownC;
}>]>;
export type MonitorDetails = t.TypeOf<typeof MonitorDetailsType>;
export declare const HttpResponseBodyType: t.PartialC<{
    bytes: t.NumberC;
    content: t.StringC;
    content_bytes: t.NumberC;
    hash: t.StringC;
}>;
export type HttpResponseBody = t.TypeOf<typeof HttpResponseBodyType>;
export declare const X509ExpiryType: t.TypeC<{
    not_after: t.StringC;
    not_before: t.StringC;
}>;
export type X509Expiry = t.TypeOf<typeof X509ExpiryType>;
export declare const X509Type: t.IntersectionC<[t.TypeC<{
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
export type X509 = t.TypeOf<typeof X509Type>;
export declare const TlsType: t.PartialC<{
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
export type Tls = t.TypeOf<typeof TlsType>;
export declare const MonitorType: t.IntersectionC<[t.TypeC<{
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
export type Monitor = t.TypeOf<typeof MonitorType>;
export declare const PingHeadersType: t.RecordC<t.StringC, t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>>;
export type PingHeaders = t.TypeOf<typeof PingHeadersType>;
export declare const AgentType: t.IntersectionC<[t.TypeC<{
    ephemeral_id: t.StringC;
    id: t.StringC;
    type: t.StringC;
    version: t.StringC;
}>, t.PartialC<{
    name: t.StringC;
    hostname: t.StringC;
}>]>;
export declare const UrlType: t.PartialC<{
    domain: t.StringC;
    full: t.StringC;
    port: t.NumberC;
    scheme: t.StringC;
    path: t.StringC;
}>;
export declare const PingType: t.IntersectionC<[t.TypeC<{
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
}>]>;
export declare const PingStateType: t.TypeC<{
    timestamp: t.StringC;
    '@timestamp': t.StringC;
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
    error: t.IntersectionC<[t.PartialC<{
        code: t.StringC;
        id: t.StringC;
        stack_trace: t.StringC;
        type: t.StringC;
    }>, t.TypeC<{
        message: t.StringC;
    }>]>;
}>;
export type Ping = t.TypeOf<typeof PingType>;
export type PingState = t.TypeOf<typeof PingStateType>;
export declare const PingStatusType: t.IntersectionC<[t.TypeC<{
    timestamp: t.StringC;
    docId: t.StringC;
    config_id: t.StringC;
    locationId: t.StringC;
    summary: t.PartialC<{
        down: t.NumberC;
        up: t.NumberC;
    }>;
}>, t.PartialC<{
    error: t.IntersectionC<[t.PartialC<{
        code: t.StringC;
        id: t.StringC;
        stack_trace: t.StringC;
        type: t.StringC;
    }>, t.TypeC<{
        message: t.StringC;
    }>]>;
}>]>;
export type PingStatus = t.TypeOf<typeof PingStatusType>;
export declare const makePing: (f: {
    docId?: string;
    type?: string;
    id?: string;
    timestamp?: string;
    ip?: string;
    status?: string;
    duration?: number;
    location?: string;
    name?: string;
    url?: string;
}) => Ping;
export declare const PingsResponseType: t.TypeC<{
    total: t.NumberC;
    pings: t.ArrayC<t.IntersectionC<[t.TypeC<{
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
}>;
export type PingsResponse = t.TypeOf<typeof PingsResponseType>;
export declare const PingStatusesResponseType: t.TypeC<{
    total: t.NumberC;
    pings: t.ArrayC<t.IntersectionC<[t.TypeC<{
        timestamp: t.StringC;
        docId: t.StringC;
        config_id: t.StringC;
        locationId: t.StringC;
        summary: t.PartialC<{
            down: t.NumberC;
            up: t.NumberC;
        }>;
    }>, t.PartialC<{
        error: t.IntersectionC<[t.PartialC<{
            code: t.StringC;
            id: t.StringC;
            stack_trace: t.StringC;
            type: t.StringC;
        }>, t.TypeC<{
            message: t.StringC;
        }>]>;
    }>]>>;
    from: t.StringC;
    to: t.StringC;
}>;
export type PingStatusesResponse = t.TypeOf<typeof PingStatusesResponseType>;
export declare const GetPingsParamsType: t.IntersectionC<[t.TypeC<{
    dateRange: t.TypeC<{
        from: t.StringC;
        to: t.StringC;
    }>;
}>, t.PartialC<{
    excludedLocations: t.StringC;
    index: t.NumberC;
    size: t.NumberC;
    pageIndex: t.NumberC;
    locations: t.StringC;
    monitorId: t.StringC;
    sort: t.StringC;
    status: t.StringC;
}>]>;
export type GetPingsParams = t.TypeOf<typeof GetPingsParamsType>;
