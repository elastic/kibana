/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEqlRequestOptions } from '../../../../common/api/search_strategy';
import { Direction } from '../../../../common/search_strategy';
import { buildEqlDsl, parseEqlResponse } from './helpers';
import { eventsResponse, sequenceResponse } from './__mocks__';
const defaultArgs = {
  defaultIndex: ['logs-endpoint.events*'],
  runtimeMappings: {},
  fieldRequested: [
    '@timestamp',
    'message',
    'event.category',
    'event.action',
    'host.name',
    'source.ip',
    'destination.ip',
  ],
  fields: [],
  filterQuery: 'sequence by host.name↵[any where true]↵[any where true]↵[any where true]',
  id: 'FkgzdTM3YXEtUmN1cVI3VS1wZ1lrdkEgVW1GSWZEX2lRZmVwQmw2c1V5RWsyZzoyMzA1MjAzMDM=',
  language: 'eql' as TimelineEqlRequestOptions['language'],
};
describe('Search Strategy EQL helper', () => {
  describe('#buildEqlDsl', () => {
    it('happy path with no options', () => {
      expect(
        buildEqlDsl({
          ...defaultArgs,
          pagination: { activePage: 0, querySize: 25 },
          sort: [
            {
              direction: Direction.desc,
              esTypes: ['date'],
              field: '@timestamp',
              type: 'date',
            },
          ],
          timerange: {
            interval: '12h',
            from: '2021-02-07T21:50:31.318Z',
            to: '2021-02-08T21:50:31.319Z',
          },
        })
      ).toMatchInlineSnapshot(`
        Object {
          "allow_no_indices": true,
          "body": Object {
            "event_category_field": "event.category",
            "fields": Array [
              Object {
                "field": "*",
                "include_unmapped": true,
              },
              Object {
                "field": "@timestamp",
                "format": "strict_date_optional_time",
              },
            ],
            "filter": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "@timestamp": Object {
                        "format": "strict_date_optional_time",
                        "gte": "2021-02-07T21:50:31.318Z",
                        "lte": "2021-02-08T21:50:31.319Z",
                      },
                    },
                  },
                ],
              },
            },
            "query": "sequence by host.name↵[any where true]↵[any where true]↵[any where true]",
            "size": 100,
            "timestamp_field": "@timestamp",
          },
          "ignore_unavailable": true,
          "index": Array [
            "logs-endpoint.events*",
          ],
        }
      `);
    });

    it('happy path with EQL options', () => {
      expect(
        buildEqlDsl({
          ...defaultArgs,
          pagination: { activePage: 1, querySize: 2 },
          sort: [
            {
              direction: Direction.desc,
              esTypes: ['date'],
              field: '@timestamp',
              type: 'date',
            },
          ],
          timerange: {
            interval: '12h',
            from: '2021-02-07T21:50:31.318Z',
            to: '2021-02-08T21:50:31.319Z',
          },
          eventCategoryField: 'event.super.category',
          tiebreakerField: 'event.my.sequence',
          timestampField: 'event.ingested',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "allow_no_indices": true,
          "body": Object {
            "event_category_field": "event.super.category",
            "fields": Array [
              Object {
                "field": "*",
                "include_unmapped": true,
              },
              Object {
                "field": "@timestamp",
                "format": "strict_date_optional_time",
              },
            ],
            "filter": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "event.ingested": Object {
                        "format": "strict_date_optional_time",
                        "gte": "2021-02-07T21:50:31.318Z",
                        "lte": "2021-02-08T21:50:31.319Z",
                      },
                    },
                  },
                ],
              },
            },
            "query": "sequence by host.name↵[any where true]↵[any where true]↵[any where true]",
            "size": 100,
            "tiebreaker_field": "event.my.sequence",
            "timestamp_field": "event.ingested",
          },
          "ignore_unavailable": true,
          "index": Array [
            "logs-endpoint.events*",
          ],
        }
      `);
    });
  });

  describe('#parseEqlResponse', () => {
    it('format events', async () => {
      const result = await parseEqlResponse(
        {
          ...defaultArgs,
          pagination: { activePage: 0, querySize: 2 },
          sort: [
            {
              direction: Direction.desc,
              field: '@timestamp',
              esTypes: ['date'],
              type: 'date',
            },
          ],
          timerange: {
            interval: '12h',
            from: '2021-02-07T21:50:31.318Z',
            to: '2021-02-08T21:50:31.319Z',
          },
        },
        eventsResponse
      );

      expect(result.edges).toMatchInlineSnapshot(`
        Array [
          Object {
            "cursor": Object {
              "tiebreaker": null,
              "value": "",
            },
            "node": Object {
              "_id": "qhymg3cBX5UUcOOYP3Ec",
              "_index": ".ds-logs-endpoint.events.security-default-2021.02.05-000005",
              "data": Array [
                Object {
                  "field": "@timestamp",
                  "value": Array [
                    "2021-02-08T21:50:28.3377092Z",
                  ],
                },
                Object {
                  "field": "event.action",
                  "value": Array [
                    "log_on",
                  ],
                },
                Object {
                  "field": "event.category",
                  "value": Array [
                    "authentication",
                    "session",
                  ],
                },
                Object {
                  "field": "host.name",
                  "value": Array [
                    "win2019-endpoint-mr-pedro",
                  ],
                },
                Object {
                  "field": "message",
                  "value": Array [
                    "Endpoint security event",
                  ],
                },
              ],
              "ecs": Object {
                "@timestamp": Array [
                  "2021-02-08T21:50:28.3377092Z",
                ],
                "_id": "qhymg3cBX5UUcOOYP3Ec",
                "_index": ".ds-logs-endpoint.events.security-default-2021.02.05-000005",
                "agent": Object {
                  "id": Array [
                    "1d15cf9e-3dc7-5b97-f586-743f7c2518b2",
                  ],
                  "type": Array [
                    "endpoint",
                  ],
                },
                "event": Object {
                  "action": Array [
                    "log_on",
                  ],
                  "category": Array [
                    "authentication",
                    "session",
                  ],
                  "created": Array [
                    "2021-02-08T21:50:28.3377092Z",
                  ],
                  "dataset": Array [
                    "endpoint.events.security",
                  ],
                  "id": Array [
                    "LzzWB9jjGmCwGMvk++++FG/O",
                  ],
                  "kind": Array [
                    "event",
                  ],
                  "module": Array [
                    "endpoint",
                  ],
                  "outcome": Array [
                    "success",
                  ],
                  "type": Array [
                    "start",
                  ],
                },
                "host": Object {
                  "id": Array [
                    "d8ad572e-d224-4044-a57d-f5a84c0dfe5d",
                  ],
                  "ip": Array [
                    "10.128.0.57",
                    "fe80::9ced:8f1c:880b:3e1f",
                    "127.0.0.1",
                    "::1",
                  ],
                  "name": Array [
                    "win2019-endpoint-mr-pedro",
                  ],
                  "os": Object {
                    "family": Array [
                      "windows",
                    ],
                    "name": Array [
                      "Windows",
                    ],
                  },
                },
                "message": Array [
                  "Endpoint security event",
                ],
                "process": Object {
                  "entity_id": Array [
                    "MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTUyODQtMTMyNTcyOTQ2MjMuOTk2NTkxMDAw",
                  ],
                  "executable": Array [
                    "C:\\\\Program Files\\\\OpenSSH-Win64\\\\sshd.exe",
                  ],
                  "name": Array [
                    "C:\\\\Program Files\\\\OpenSSH-Win64\\\\sshd.exe",
                  ],
                },
                "timestamp": "2021-02-08T21:50:28.3377092Z",
                "user": Object {
                  "domain": Array [
                    "NT AUTHORITY",
                  ],
                  "name": Array [
                    "SYSTEM",
                  ],
                },
              },
            },
          },
          Object {
            "cursor": Object {
              "tiebreaker": null,
              "value": "",
            },
            "node": Object {
              "_id": "qxymg3cBX5UUcOOYP3Ec",
              "_index": ".ds-logs-endpoint.events.security-default-2021.02.05-000005",
              "data": Array [
                Object {
                  "field": "@timestamp",
                  "value": Array [
                    "2021-02-08T21:50:28.3377142Z",
                  ],
                },
                Object {
                  "field": "event.action",
                  "value": Array [
                    "log_on",
                  ],
                },
                Object {
                  "field": "event.category",
                  "value": Array [
                    "authentication",
                    "session",
                  ],
                },
                Object {
                  "field": "host.name",
                  "value": Array [
                    "win2019-endpoint-mr-pedro",
                  ],
                },
                Object {
                  "field": "message",
                  "value": Array [
                    "Endpoint security event",
                  ],
                },
              ],
              "ecs": Object {
                "@timestamp": Array [
                  "2021-02-08T21:50:28.3377142Z",
                ],
                "_id": "qxymg3cBX5UUcOOYP3Ec",
                "_index": ".ds-logs-endpoint.events.security-default-2021.02.05-000005",
                "agent": Object {
                  "id": Array [
                    "1d15cf9e-3dc7-5b97-f586-743f7c2518b2",
                  ],
                  "type": Array [
                    "endpoint",
                  ],
                },
                "event": Object {
                  "action": Array [
                    "log_on",
                  ],
                  "category": Array [
                    "authentication",
                    "session",
                  ],
                  "created": Array [
                    "2021-02-08T21:50:28.3377142Z",
                  ],
                  "dataset": Array [
                    "endpoint.events.security",
                  ],
                  "id": Array [
                    "LzzWB9jjGmCwGMvk++++FG/P",
                  ],
                  "kind": Array [
                    "event",
                  ],
                  "module": Array [
                    "endpoint",
                  ],
                  "outcome": Array [
                    "success",
                  ],
                  "type": Array [
                    "start",
                  ],
                },
                "host": Object {
                  "id": Array [
                    "d8ad572e-d224-4044-a57d-f5a84c0dfe5d",
                  ],
                  "ip": Array [
                    "10.128.0.57",
                    "fe80::9ced:8f1c:880b:3e1f",
                    "127.0.0.1",
                    "::1",
                  ],
                  "name": Array [
                    "win2019-endpoint-mr-pedro",
                  ],
                  "os": Object {
                    "family": Array [
                      "windows",
                    ],
                    "name": Array [
                      "Windows",
                    ],
                  },
                },
                "message": Array [
                  "Endpoint security event",
                ],
                "process": Object {
                  "entity_id": Array [
                    "MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=",
                  ],
                  "executable": Array [
                    "C:\\\\Windows\\\\System32\\\\lsass.exe",
                  ],
                },
                "timestamp": "2021-02-08T21:50:28.3377142Z",
                "user": Object {
                  "domain": Array [
                    "NT AUTHORITY",
                  ],
                  "name": Array [
                    "SYSTEM",
                  ],
                },
              },
            },
          },
        ]
      `);
    });
    it('sequence events', async () => {
      const result = await parseEqlResponse(
        {
          ...defaultArgs,
          pagination: { activePage: 3, querySize: 2 },
          sort: [
            {
              direction: Direction.desc,
              esTypes: ['date'],
              field: '@timestamp',
              type: 'date',
            },
          ],
          timerange: {
            interval: '12h',
            from: '2021-02-07T21:50:31.318Z',
            to: '2021-02-08T21:50:31.319Z',
          },
        },
        sequenceResponse
      );
      expect(result.edges).toMatchInlineSnapshot(`
        Array [
          Object {
            "cursor": Object {
              "tiebreaker": null,
              "value": "",
            },
            "node": Object {
              "_id": "rBymg3cBX5UUcOOYP3Ec",
              "_index": ".ds-logs-endpoint.events.security-default-2021.02.05-000005",
              "data": Array [
                Object {
                  "field": "@timestamp",
                  "value": Array [
                    "2021-02-08T21:50:28.3381013Z",
                  ],
                },
                Object {
                  "field": "event.category",
                  "value": Array [],
                },
                Object {
                  "field": "host.name",
                  "value": Array [
                    "win2019-endpoint-mr-pedro",
                  ],
                },
                Object {
                  "field": "message",
                  "value": Array [
                    "Endpoint security event",
                  ],
                },
              ],
              "ecs": Object {
                "@timestamp": Array [
                  "2021-02-08T21:50:28.3381013Z",
                ],
                "_id": "rBymg3cBX5UUcOOYP3Ec",
                "_index": ".ds-logs-endpoint.events.security-default-2021.02.05-000005",
                "agent": Object {
                  "id": Array [
                    "1d15cf9e-3dc7-5b97-f586-743f7c2518b2",
                  ],
                  "type": Array [
                    "endpoint",
                  ],
                },
                "eql": Object {
                  "parentId": "rBymg3cBX5UUcOOYP3Ec",
                  "sequenceNumber": "2-0",
                },
                "event": Object {
                  "category": Array [],
                  "created": Array [
                    "2021-02-08T21:50:28.3381013Z",
                  ],
                  "dataset": Array [
                    "endpoint.events.security",
                  ],
                  "id": Array [
                    "LzzWB9jjGmCwGMvk++++FG/Q",
                  ],
                  "kind": Array [
                    "event",
                  ],
                  "module": Array [
                    "endpoint",
                  ],
                  "type": Array [],
                },
                "host": Object {
                  "id": Array [
                    "d8ad572e-d224-4044-a57d-f5a84c0dfe5d",
                  ],
                  "ip": Array [
                    "10.128.0.57",
                    "fe80::9ced:8f1c:880b:3e1f",
                    "127.0.0.1",
                    "::1",
                  ],
                  "name": Array [
                    "win2019-endpoint-mr-pedro",
                  ],
                  "os": Object {
                    "family": Array [
                      "windows",
                    ],
                    "name": Array [
                      "Windows",
                    ],
                  },
                },
                "message": Array [
                  "Endpoint security event",
                ],
                "process": Object {
                  "entity_id": Array [
                    "MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=",
                  ],
                  "executable": Array [
                    "C:\\\\Windows\\\\System32\\\\lsass.exe",
                  ],
                },
                "timestamp": "2021-02-08T21:50:28.3381013Z",
                "user": Object {
                  "domain": Array [
                    "NT AUTHORITY",
                  ],
                  "name": Array [
                    "SYSTEM",
                  ],
                },
              },
            },
          },
          Object {
            "cursor": Object {
              "tiebreaker": null,
              "value": "",
            },
            "node": Object {
              "_id": "pxymg3cBX5UUcOOYP3Ec",
              "_index": ".ds-logs-endpoint.events.process-default-2021.02.02-000005",
              "data": Array [
                Object {
                  "field": "@timestamp",
                  "value": Array [
                    "2021-02-08T21:50:28.3446355Z",
                  ],
                },
                Object {
                  "field": "event.action",
                  "value": Array [
                    "start",
                  ],
                },
                Object {
                  "field": "event.category",
                  "value": Array [
                    "process",
                  ],
                },
                Object {
                  "field": "host.name",
                  "value": Array [
                    "win2019-endpoint-mr-pedro",
                  ],
                },
                Object {
                  "field": "message",
                  "value": Array [
                    "Endpoint process event",
                  ],
                },
              ],
              "ecs": Object {
                "@timestamp": Array [
                  "2021-02-08T21:50:28.3446355Z",
                ],
                "_id": "pxymg3cBX5UUcOOYP3Ec",
                "_index": ".ds-logs-endpoint.events.process-default-2021.02.02-000005",
                "agent": Object {
                  "id": Array [
                    "1d15cf9e-3dc7-5b97-f586-743f7c2518b2",
                  ],
                  "type": Array [
                    "endpoint",
                  ],
                },
                "eql": Object {
                  "parentId": "rBymg3cBX5UUcOOYP3Ec",
                  "sequenceNumber": "2-1",
                },
                "event": Object {
                  "action": Array [
                    "start",
                  ],
                  "category": Array [
                    "process",
                  ],
                  "created": Array [
                    "2021-02-08T21:50:28.3446355Z",
                  ],
                  "dataset": Array [
                    "endpoint.events.process",
                  ],
                  "id": Array [
                    "LzzWB9jjGmCwGMvk++++FG/K",
                  ],
                  "kind": Array [
                    "event",
                  ],
                  "module": Array [
                    "endpoint",
                  ],
                  "type": Array [
                    "start",
                  ],
                },
                "host": Object {
                  "id": Array [
                    "d8ad572e-d224-4044-a57d-f5a84c0dfe5d",
                  ],
                  "ip": Array [
                    "10.128.0.57",
                    "fe80::9ced:8f1c:880b:3e1f",
                    "127.0.0.1",
                    "::1",
                  ],
                  "name": Array [
                    "win2019-endpoint-mr-pedro",
                  ],
                  "os": Object {
                    "family": Array [
                      "windows",
                    ],
                    "name": Array [
                      "Windows",
                    ],
                  },
                },
                "message": Array [
                  "Endpoint process event",
                ],
                "process": Object {
                  "args": Array [
                    "C:\\\\Program Files\\\\OpenSSH-Win64\\\\sshd.exe",
                    "-y",
                  ],
                  "entity_id": Array [
                    "MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTYzNjgtMTMyNTcyOTQ2MjguMzQ0NjM1NTAw",
                  ],
                  "executable": Array [
                    "C:\\\\Program Files\\\\OpenSSH-Win64\\\\sshd.exe",
                  ],
                  "hash": Object {
                    "md5": Array [
                      "331ba0e529810ef718dd3efbd1242302",
                    ],
                    "sha1": Array [
                      "631244d731f406394c17c7dfd85203e317c74814",
                    ],
                    "sha256": Array [
                      "e6a972f9db27de18be225095b3b3141b945be8aadc4014c8704ae5acafe3e8e0",
                    ],
                  },
                  "name": Array [
                    "sshd.exe",
                  ],
                  "parent": Object {
                    "name": Array [
                      "sshd.exe",
                    ],
                    "pid": Array [
                      "5284",
                    ],
                  },
                  "pid": Array [
                    "6368",
                  ],
                },
                "timestamp": "2021-02-08T21:50:28.3446355Z",
                "user": Object {
                  "domain": Array [
                    "",
                  ],
                  "name": Array [
                    "",
                  ],
                },
              },
            },
          },
        ]
      `);
    });
  });
});
