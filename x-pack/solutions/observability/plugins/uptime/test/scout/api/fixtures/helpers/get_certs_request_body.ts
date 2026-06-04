/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import DateMath from '@kbn/datemath';

import type { Cert, CertResult } from './runtime_types';

// Self-contained copy of the certs request body builder used by
// x-pack/solutions/observability/plugins/uptime/common/requests/get_certs_request_body.ts.
// Inlined here to keep the Scout test directory free of relative imports into
// the uptime plugin source (which crosses TS composite project boundaries) and
// independent of the legacy uptime runtime types.

export interface GetCertsParams {
  pageIndex: number;
  search?: string;
  notValidBefore?: string;
  notValidAfter?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  direction?: string;
  size?: number;
  filters?: unknown;
  monitorIds?: string[];
}

const EXCLUDE_RUN_ONCE_FILTER = {
  bool: { must_not: { exists: { field: 'run_once' } } },
};

const SUMMARY_FILTER = {
  exists: {
    field: 'summary',
  },
};

const getRangeFilter = ({ from, to }: { from: string; to: string }) => ({
  range: {
    '@timestamp': {
      gte: from,
      lte: to,
    },
  },
});

const SortFields = {
  issuer: 'tls.server.x509.issuer.common_name',
  not_after: 'tls.server.x509.not_after',
  not_before: 'tls.server.x509.not_before',
  common_name: 'tls.server.x509.subject.common_name',
} as const;

const DEFAULT_SORT = 'not_after';
const DEFAULT_DIRECTION = 'asc';
const DEFAULT_SIZE = 20;
const DEFAULT_FROM = 'now-20m';
const DEFAULT_TO = 'now';

const absoluteDate = (relativeDate: string) =>
  DateMath.parse(relativeDate)?.valueOf() ?? relativeDate;

export const getCertsRequestBody = ({
  monitorIds,
  pageIndex,
  search,
  notValidBefore,
  notValidAfter,
  size = DEFAULT_SIZE,
  to = DEFAULT_TO,
  from = DEFAULT_FROM,
  sortBy = DEFAULT_SORT,
  direction = DEFAULT_DIRECTION,
  filters,
}: GetCertsParams): estypes.SearchRequest => {
  const sort = SortFields[sortBy as keyof typeof SortFields];

  return {
    from: pageIndex * size,
    size,
    sort: [
      {
        [sort]: {
          order: direction as estypes.SortOrder,
        },
      },
    ],
    query: {
      bool: {
        ...(search
          ? {
              minimum_should_match: 1,
              should: [
                {
                  multi_match: {
                    query: escape(search),
                    type: 'phrase_prefix',
                    fields: [
                      'monitor.id.text',
                      'monitor.name.text',
                      'url.full.text',
                      'tls.server.x509.subject.common_name.text',
                      'tls.server.x509.issuer.common_name.text',
                    ],
                  },
                },
              ],
            }
          : {}),
        filter: [
          SUMMARY_FILTER,
          EXCLUDE_RUN_ONCE_FILTER,
          ...(filters ? [filters] : []),
          ...(monitorIds && monitorIds.length > 0 ? [{ terms: { 'monitor.id': monitorIds } }] : []),
          {
            exists: {
              field: 'tls.server.hash.sha256',
            },
          },
          getRangeFilter({
            from: 'now-7d',
            to: 'now',
          }),
          {
            range: {
              'monitor.timespan': {
                gte: absoluteDate(from),
                lte: absoluteDate(to),
              },
            },
          },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                ...(notValidBefore
                  ? [
                      {
                        range: {
                          'tls.server.x509.not_before': {
                            lte: absoluteDate(notValidBefore),
                          },
                        },
                      },
                    ]
                  : []),
                ...(notValidAfter
                  ? [
                      {
                        range: {
                          'tls.server.x509.not_after': {
                            lte: absoluteDate(notValidAfter),
                          },
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
        ] as estypes.QueryDslQueryContainer[],
      },
    },
    _source: [
      'monitor.id',
      'monitor.name',
      'monitor.type',
      'url.full',
      'observer.geo.name',
      'tls.server.x509.issuer.common_name',
      'tls.server.x509.subject.common_name',
      'tls.server.hash.sha1',
      'tls.server.hash.sha256',
      'tls.server.x509.not_after',
      'tls.server.x509.not_before',
    ],
    collapse: {
      field: 'tls.server.hash.sha256',
      inner_hits: {
        _source: {
          includes: ['monitor.id', 'monitor.name', 'url.full', 'config_id'],
        },
        collapse: {
          field: 'monitor.id',
        },
        name: 'monitors',
        sort: [{ 'monitor.id': 'asc' }],
      },
    },
    aggs: {
      total: {
        cardinality: {
          field: 'tls.server.hash.sha256',
        },
      },
    },
  };
};

interface CertSearchHit {
  _source: {
    monitor?: { name?: string; id?: string; type?: string };
    url?: { full?: string };
    observer?: { geo?: { name?: string } };
    tls?: {
      server?: {
        x509?: {
          issuer?: { common_name?: string };
          subject?: { common_name?: string };
          not_after?: string;
          not_before?: string;
        };
        hash?: { sha1?: string; sha256?: string };
      };
    };
  };
  inner_hits?: {
    monitors: {
      hits: {
        hits: Array<{
          _source: {
            monitor?: { name?: string; id?: string };
            config_id?: string;
            url?: { full?: string };
          };
        }>;
      };
    };
  };
}

interface CertSearchResponse {
  hits?: { hits?: CertSearchHit[] };
  aggregations?: { total?: { value?: number } };
}

export const processCertsResult = (result: CertSearchResponse): CertResult => {
  const certs: Cert[] = (result.hits?.hits ?? []).map((hit) => {
    const ping = hit._source;
    const server = ping.tls?.server;

    const notAfter = server?.x509?.not_after;
    const notBefore = server?.x509?.not_before;
    const issuer = server?.x509?.issuer?.common_name;
    const commonName = server?.x509?.subject?.common_name;
    const sha1 = server?.hash?.sha1;
    const sha256 = server?.hash?.sha256;

    const monitors = (hit.inner_hits?.monitors.hits.hits ?? []).map((monitor) => {
      const monitorPing = monitor._source;
      return {
        name: monitorPing?.monitor?.name,
        id: monitorPing?.monitor?.id,
        configId: monitorPing?.config_id,
        url: monitorPing?.url?.full,
      };
    });

    return {
      monitors,
      issuer,
      sha1,
      sha256: sha256 as string,
      not_after: notAfter,
      not_before: notBefore,
      common_name: commonName,
      monitorName: ping?.monitor?.name,
      monitorUrl: ping?.url?.full,
      monitorType: ping?.monitor?.type,
      locationName: ping?.observer?.geo?.name,
    };
  });
  const total = result.aggregations?.total?.value ?? 0;
  return { certs, total };
};
