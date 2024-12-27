/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { IEsSearchResponse } from '@kbn/search-types';
import type { HostsRequestOptions } from '../../../../../../../common/api/search_strategy';
import { HostsFields } from '../../../../../../../common/api/search_strategy/hosts/model/sort';

import type { HostAggEsItem } from '../../../../../../../common/search_strategy';
import { Direction, HostsQueries } from '../../../../../../../common/search_strategy';
import { createMockEndpointAppContext } from '../../../../../../endpoint/mocks';

export const mockOptions: HostsRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  factoryQueryType: HostsQueries.hosts,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  timerange: { interval: '12h', from: '2020-09-03T09:15:21.415Z', to: '2020-09-04T09:15:21.415Z' },
  sort: { direction: Direction.desc, field: HostsFields.lastSeen },
  isNewRiskScoreModuleInstalled: false,
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 169,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      host_data: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'bastion00.siem.estc.dev',
            doc_count: 774875,
            lastSeen: { value: 1599210921410, value_as_string: '2020-09-04T09:15:21.410Z' },
            os: {
              hits: {
                total: 774875,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'f6NmWHQBA6bGZw2uJepK',
                    _score: null,
                    fields: {},
                    sort: [1599210921410],
                  },
                ],
              },
            },
          },
          {
            key: 'es02.siem.estc.dev',
            doc_count: 10496,
            lastSeen: { value: 1599210907990, value_as_string: '2020-09-04T09:15:07.990Z' },
            os: {
              hits: {
                total: 10496,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: '4_lmWHQBc39KFIJbFdYv',
                    _score: null,
                    fields: {},
                    sort: [1599210907990],
                  },
                ],
              },
            },
          },
          {
            key: 'es00.siem.estc.dev',
            doc_count: 19722,
            lastSeen: { value: 1599210906783, value_as_string: '2020-09-04T09:15:06.783Z' },
            os: {
              hits: {
                total: 19722,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'z_lmWHQBc39KFIJbAdZP',
                    _score: null,
                    fields: {},
                    sort: [1599210906783],
                  },
                ],
              },
            },
          },
          {
            key: 'es01.siem.estc.dev',
            doc_count: 16770,
            lastSeen: { value: 1599210900781, value_as_string: '2020-09-04T09:15:00.781Z' },
            os: {
              hits: {
                total: 16770,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'uPllWHQBc39KFIJb6tbR',
                    _score: null,
                    fields: {},
                    sort: [1599210900781],
                  },
                ],
              },
            },
          },
          {
            key: 'siem-windows',
            doc_count: 1941,
            lastSeen: { value: 1599210880354, value_as_string: '2020-09-04T09:14:40.354Z' },
            os: {
              hits: {
                total: 1941,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '56NlWHQBA6bGZw2uiOfb',
                    _score: null,
                    fields: {
                      'host.os.name': 'Windows Server 2019 Datacenter',
                      'host.os.family': 'windows',
                      'host.os.version': '10.0',
                      'host.os.platform': 'windows',
                    },
                    sort: [1599210880354],
                  },
                ],
              },
            },
          },
          {
            key: 'filebeat-cloud',
            doc_count: 50,
            lastSeen: { value: 1599207421000, value_as_string: '2020-09-04T08:17:01.000Z' },
            os: {
              hits: {
                total: 50,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'FKMwWHQBA6bGZw2uw5Z3',
                    _score: null,
                    fields: {},
                    sort: [1599207421000],
                  },
                ],
              },
            },
          },
          {
            key: 'kibana00.siem.estc.dev',
            doc_count: 50,
            lastSeen: { value: 1599207421000, value_as_string: '2020-09-04T08:17:01.000Z' },
            os: {
              hits: {
                total: 50,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'MKMwWHQBA6bGZw2u0ZZw',
                    _score: null,
                    fields: {},
                    sort: [1599207421000],
                  },
                ],
              },
            },
          },
          {
            key: 'DESKTOP-QBBSCUT',
            doc_count: 128973,
            lastSeen: { value: 1599150487957, value_as_string: '2020-09-03T16:28:07.957Z' },
            os: {
              hits: {
                total: 128973,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-elastic.agent-default-000001',
                    _id: 'tvTLVHQBc39KFIJb_ykQ',
                    _score: null,
                    fields: {
                      'host.os.name': 'Windows 10 Pro',
                      'host.os.family': 'windows',
                      'host.os.version': '10.0',
                      'host.os.platform': 'windows',
                    },
                    sort: [1599150487957],
                  },
                ],
              },
            },
          },
          {
            key: 'mainqa-atlcolo-10-0-7-195.eng.endgames.local',
            doc_count: 21213,
            lastSeen: { value: 1599150457515, value_as_string: '2020-09-03T16:27:37.515Z' },
            os: {
              hits: {
                total: 21213,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.network-default-000001',
                    _id: 'efTLVHQBc39KFIJbiCgD',
                    _score: null,
                    fields: {
                      'host.os.name': 'macOS',
                      'host.os.family': 'macos',
                      'host.os.version': '10.14.1',
                      'host.os.platform': 'macos',
                    },
                    sort: [1599150457515],
                  },
                ],
              },
            },
          },
        ],
      },
      host_count: { value: 9 },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 169,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      host_data: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'bastion00.siem.estc.dev',
            doc_count: 774875,
            lastSeen: { value: 1599210921410, value_as_string: '2020-09-04T09:15:21.410Z' },
            os: {
              hits: {
                total: 774875,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'f6NmWHQBA6bGZw2uJepK',
                    _score: null,
                    fields: {},
                    sort: [1599210921410],
                  },
                ],
              },
            },
          },
          {
            key: 'es02.siem.estc.dev',
            doc_count: 10496,
            lastSeen: { value: 1599210907990, value_as_string: '2020-09-04T09:15:07.990Z' },
            os: {
              hits: {
                total: 10496,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: '4_lmWHQBc39KFIJbFdYv',
                    _score: null,
                    fields: {},
                    sort: [1599210907990],
                  },
                ],
              },
            },
          },
          {
            key: 'es00.siem.estc.dev',
            doc_count: 19722,
            lastSeen: { value: 1599210906783, value_as_string: '2020-09-04T09:15:06.783Z' },
            os: {
              hits: {
                total: 19722,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'z_lmWHQBc39KFIJbAdZP',
                    _score: null,
                    fields: {},
                    sort: [1599210906783],
                  },
                ],
              },
            },
          },
          {
            key: 'es01.siem.estc.dev',
            doc_count: 16770,
            lastSeen: { value: 1599210900781, value_as_string: '2020-09-04T09:15:00.781Z' },
            os: {
              hits: {
                total: 16770,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'uPllWHQBc39KFIJb6tbR',
                    _score: null,
                    fields: {},
                    sort: [1599210900781],
                  },
                ],
              },
            },
          },
          {
            key: 'siem-windows',
            doc_count: 1941,
            lastSeen: { value: 1599210880354, value_as_string: '2020-09-04T09:14:40.354Z' },
            os: {
              hits: {
                total: 1941,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '56NlWHQBA6bGZw2uiOfb',
                    _score: null,
                    fields: {
                      'host.os.name': 'Windows Server 2019 Datacenter',
                      'host.os.family': 'windows',
                      'host.os.version': '10.0',
                      'host.os.platform': 'windows',
                    },
                    sort: [1599210880354],
                  },
                ],
              },
            },
          },
          {
            key: 'filebeat-cloud',
            doc_count: 50,
            lastSeen: { value: 1599207421000, value_as_string: '2020-09-04T08:17:01.000Z' },
            os: {
              hits: {
                total: 50,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'FKMwWHQBA6bGZw2uw5Z3',
                    _score: null,
                    fields: {},
                    sort: [1599207421000],
                  },
                ],
              },
            },
          },
          {
            key: 'kibana00.siem.estc.dev',
            doc_count: 50,
            lastSeen: { value: 1599207421000, value_as_string: '2020-09-04T08:17:01.000Z' },
            os: {
              hits: {
                total: 50,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'MKMwWHQBA6bGZw2u0ZZw',
                    _score: null,
                    fields: {},
                    sort: [1599207421000],
                  },
                ],
              },
            },
          },
          {
            key: 'DESKTOP-QBBSCUT',
            doc_count: 128973,
            lastSeen: { value: 1599150487957, value_as_string: '2020-09-03T16:28:07.957Z' },
            os: {
              hits: {
                total: 128973,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-elastic.agent-default-000001',
                    _id: 'tvTLVHQBc39KFIJb_ykQ',
                    _score: null,
                    fields: {
                      'host.os.name': 'Windows 10 Pro',
                      'host.os.family': 'windows',
                      'host.os.version': '10.0',
                      'host.os.platform': 'windows',
                    },
                    sort: [1599150487957],
                  },
                ],
              },
            },
          },
          {
            key: 'mainqa-atlcolo-10-0-7-195.eng.endgames.local',
            doc_count: 21213,
            lastSeen: { value: 1599150457515, value_as_string: '2020-09-03T16:27:37.515Z' },
            os: {
              hits: {
                total: 21213,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.network-default-000001',
                    _id: 'efTLVHQBc39KFIJbiCgD',
                    _score: null,
                    fields: {
                      'host.os.name': 'macOS',
                      'host.os.family': 'macos',
                      'host.os.version': '10.14.1',
                      'host.os.platform': 'macos',
                    },
                    sort: [1599150457515],
                  },
                ],
              },
            },
          },
        ],
      },
      host_count: { value: 9 },
    },
  },
  total: 21,
  loaded: 21,
  inspect: {
    dsl: [
      JSON.stringify(
        {
          allow_no_indices: true,
          index: [
            'apm-*-transaction*',
            'traces-apm*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          ignore_unavailable: true,
          track_total_hits: false,
          body: {
            aggregations: {
              host_count: { cardinality: { field: 'host.name' } },
              host_data: {
                terms: { size: 10, field: 'host.name', order: { lastSeen: 'desc' } },
                aggs: {
                  lastSeen: { max: { field: '@timestamp' } },
                  os: {
                    top_hits: {
                      size: 1,
                      sort: [{ '@timestamp': { order: 'desc' } }],
                      _source: false,
                    },
                  },
                },
              },
            },
            query: {
              bool: {
                filter: [
                  { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
                  {
                    range: {
                      '@timestamp': {
                        gte: '2020-09-03T09:15:21.415Z',
                        lte: '2020-09-04T09:15:21.415Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
              },
            },
            _source: false,
            fields: [
              'host.id',
              'host.name',
              'host.os.name',
              'host.os.version',
              {
                field: '@timestamp',
                format: 'strict_date_optional_time',
              },
            ],
            size: 0,
          },
        },
        null,
        2
      ),
    ],
  },
  edges: [
    {
      node: {
        _id: 'bastion00.siem.estc.dev',
        lastSeen: ['2020-09-04T09:15:21.410Z'],
        host: { name: ['bastion00.siem.estc.dev'] },
      },
      cursor: { value: 'bastion00.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'es02.siem.estc.dev',
        lastSeen: ['2020-09-04T09:15:07.990Z'],
        host: { name: ['es02.siem.estc.dev'] },
      },
      cursor: { value: 'es02.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'es00.siem.estc.dev',
        lastSeen: ['2020-09-04T09:15:06.783Z'],
        host: { name: ['es00.siem.estc.dev'] },
      },
      cursor: { value: 'es00.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'es01.siem.estc.dev',
        lastSeen: ['2020-09-04T09:15:00.781Z'],
        host: { name: ['es01.siem.estc.dev'] },
      },
      cursor: { value: 'es01.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'siem-windows',
        lastSeen: ['2020-09-04T09:14:40.354Z'],
        host: {
          name: ['siem-windows'],
          os: { name: ['Windows Server 2019 Datacenter'], version: ['10.0'] },
        },
      },
      cursor: { value: 'siem-windows', tiebreaker: null },
    },
    {
      node: {
        _id: 'filebeat-cloud',
        lastSeen: ['2020-09-04T08:17:01.000Z'],
        host: { name: ['filebeat-cloud'] },
      },
      cursor: { value: 'filebeat-cloud', tiebreaker: null },
    },
    {
      node: {
        _id: 'kibana00.siem.estc.dev',
        lastSeen: ['2020-09-04T08:17:01.000Z'],
        host: { name: ['kibana00.siem.estc.dev'] },
      },
      cursor: { value: 'kibana00.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'DESKTOP-QBBSCUT',
        lastSeen: ['2020-09-03T16:28:07.957Z'],
        host: { name: ['DESKTOP-QBBSCUT'], os: { name: ['Windows 10 Pro'], version: ['10.0'] } },
      },
      cursor: { value: 'DESKTOP-QBBSCUT', tiebreaker: null },
    },
    {
      node: {
        _id: 'mainqa-atlcolo-10-0-7-195.eng.endgames.local',
        lastSeen: ['2020-09-03T16:27:37.515Z'],
        host: {
          name: ['mainqa-atlcolo-10-0-7-195.eng.endgames.local'],
          os: { name: ['macOS'], version: ['10.14.1'] },
        },
      },
      cursor: { value: 'mainqa-atlcolo-10-0-7-195.eng.endgames.local', tiebreaker: null },
    },
  ],
  totalCount: 9,
  pageInfo: { activePage: 0, fakeTotalCount: 9, showMorePagesIndicator: false },
};

export const mockBuckets: HostAggEsItem = {
  key: 'zeek-london',
  os: {
    hits: {
      total: {
        value: 242338,
        relation: 'eq',
      },
      max_score: null,
      hits: [
        {
          _index: 'auditbeat-8.0.0-2019.09.06-000022',
          _id: 'dl0T_m0BHe9nqdOiF2A8',
          _score: null,
          fields: {
            'host.os.name': ['Ubuntu'],
            'host.os.family': ['debian'],
            'host.os.version': ['18.04.2 LTS (Bionic Beaver)'],
            'host.os.platform': ['ubuntu'],
          },
          sort: [1571925726017],
        },
      ],
    },
  },
};

export const expectedDsl = {
  allow_no_indices: true,
  track_total_hits: false,
  body: {
    aggregations: {
      host_count: { cardinality: { field: 'host.name' } },
      host_data: {
        aggs: {
          lastSeen: { max: { field: '@timestamp' } },
          os: {
            top_hits: {
              _source: false,
              size: 1,
              sort: [{ '@timestamp': { order: 'desc' } }],
            },
          },
        },
        terms: { field: 'host.name', order: { lastSeen: 'desc' }, size: 10 },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } },
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2020-09-03T09:15:21.415Z',
                lte: '2020-09-04T09:15:21.415Z',
              },
            },
          },
        ],
      },
    },
    _source: false,
    fields: [
      'host.id',
      'host.name',
      'host.os.name',
      'host.os.version',
      {
        field: '@timestamp',
        format: 'strict_date_optional_time',
      },
    ],
    size: 0,
  },
  ignore_unavailable: true,
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
};

export const mockDeps = {
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: {} as SavedObjectsClientContract,
  endpointContext: createMockEndpointAppContext(),
  request: {} as KibanaRequest,
};
