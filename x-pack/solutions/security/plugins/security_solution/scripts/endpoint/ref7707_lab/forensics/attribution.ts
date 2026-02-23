/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';

export interface DnsInitiatorHit {
    hostName: string;
    firstSeen: string;
    lastSeen: string;
    count: number;
}

export const findDnsInitiators = async ({
    esClient,
    domain,
    from = 'now-30m',
    to = 'now',
    index = ['packetbeat-*', 'logs-*'],
    maxHosts = 20,
}: {
    esClient: Client;
    domain: string;
    from?: string;
    to?: string;
    index?: string[];
    maxHosts?: number;
}): Promise<DnsInitiatorHit[]> => {
    const response = await esClient.search<unknown>({
        index,
        size: 0,
        query: {
            bool: {
                filter: [
                    { range: { '@timestamp': { gte: from, lte: to } } },
                    { term: { 'dns.question.name': domain } },
                ],
            },
        } as estypes.QueryDslQueryContainer,
        aggs: {
            by_host: {
                terms: {
                    field: 'host.name',
                    size: maxHosts,
                    missing: '__missing__',
                },
                aggs: {
                    first: { min: { field: '@timestamp' } },
                    last: { max: { field: '@timestamp' } },
                },
            },
        },
    });

    const buckets = (response.aggregations as any)?.by_host?.buckets ?? [];
    const hits: DnsInitiatorHit[] = buckets
        .map((b: any) => ({
            hostName: b.key,
            firstSeen: b.first?.value_as_string ?? '',
            lastSeen: b.last?.value_as_string ?? '',
            count: b.doc_count ?? 0,
        }))
        .filter((h) => h.hostName && h.hostName !== '__missing__')
        .sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));

    return hits;
};


