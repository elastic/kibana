import * as t from 'io-ts';
declare const NetworkTimingsType: t.TypeC<{
    queueing: t.NumberC;
    connect: t.NumberC;
    total: t.NumberC;
    send: t.NumberC;
    blocked: t.NumberC;
    receive: t.NumberC;
    wait: t.NumberC;
    dns: t.NumberC;
    proxy: t.NumberC;
    ssl: t.NumberC;
}>;
declare const CertificateDataType: t.PartialC<{
    validFrom: t.StringC;
    validTo: t.StringC;
    issuer: t.StringC;
    subjectName: t.StringC;
}>;
declare const NetworkEventType: t.IntersectionC<[t.TypeC<{
    timestamp: t.StringC;
    requestSentTime: t.NumberC;
    loadEndTime: t.NumberC;
    url: t.StringC;
}>, t.PartialC<{
    certificates: t.PartialC<{
        validFrom: t.StringC;
        validTo: t.StringC;
        issuer: t.StringC;
        subjectName: t.StringC;
    }>;
    ip: t.StringC;
    method: t.StringC;
    status: t.NumberC;
    mimeType: t.StringC;
    responseHeaders: t.RecordC<t.StringC, t.StringC>;
    requestHeaders: t.RecordC<t.StringC, t.StringC>;
    timings: t.TypeC<{
        queueing: t.NumberC;
        connect: t.NumberC;
        total: t.NumberC;
        send: t.NumberC;
        blocked: t.NumberC;
        receive: t.NumberC;
        wait: t.NumberC;
        dns: t.NumberC;
        proxy: t.NumberC;
        ssl: t.NumberC;
    }>;
    transferSize: t.NumberC;
    resourceSize: t.NumberC;
}>]>;
export type NetworkTimings = t.TypeOf<typeof NetworkTimingsType>;
export type CertificateData = t.TypeOf<typeof CertificateDataType>;
export type NetworkEvent = t.TypeOf<typeof NetworkEventType>;
export declare const SyntheticsNetworkEventsApiResponseType: t.TypeC<{
    events: t.ArrayC<t.IntersectionC<[t.TypeC<{
        timestamp: t.StringC;
        requestSentTime: t.NumberC;
        loadEndTime: t.NumberC;
        url: t.StringC;
    }>, t.PartialC<{
        certificates: t.PartialC<{
            validFrom: t.StringC;
            validTo: t.StringC;
            issuer: t.StringC;
            subjectName: t.StringC;
        }>;
        ip: t.StringC;
        method: t.StringC;
        status: t.NumberC;
        mimeType: t.StringC;
        responseHeaders: t.RecordC<t.StringC, t.StringC>;
        requestHeaders: t.RecordC<t.StringC, t.StringC>;
        timings: t.TypeC<{
            queueing: t.NumberC;
            connect: t.NumberC;
            total: t.NumberC;
            send: t.NumberC;
            blocked: t.NumberC;
            receive: t.NumberC;
            wait: t.NumberC;
            dns: t.NumberC;
            proxy: t.NumberC;
            ssl: t.NumberC;
        }>;
        transferSize: t.NumberC;
        resourceSize: t.NumberC;
    }>]>>;
    total: t.NumberC;
    isWaterfallSupported: t.BooleanC;
    hasNavigationRequest: t.BooleanC;
}>;
export type SyntheticsNetworkEventsApiResponse = t.TypeOf<typeof SyntheticsNetworkEventsApiResponseType>;
export {};
