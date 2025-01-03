/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { DeleteSLOInstances } from './delete_slo_instances';

describe('DeleteSLOInstances', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let deleteSLOInstances: DeleteSLOInstances;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    deleteSLOInstances = new DeleteSLOInstances(mockEsClient);
  });

  describe('validation', () => {
    it("forbids deleting an SLO with an '*' (all) instance id", async () => {
      await expect(
        deleteSLOInstances.execute({
          list: [
            { sloId: 'first', instanceId: 'irrelevant' },
            { sloId: 'second', instanceId: '*' },
          ],
        })
      ).rejects.toThrowError("Cannot delete an SLO instance '*'");
    });
  });

  it('deletes the roll up and the summary data for each tuple', async () => {
    await deleteSLOInstances.execute({
      list: [
        { sloId: 'first', instanceId: 'host-foo' },
        { sloId: 'second', instanceId: 'host-foo' },
        { sloId: 'third', instanceId: 'cluster-eu' },
      ],
    });

    expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(2);
    expect(mockEsClient.deleteByQuery.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "index": ".slo-observability.sli-v3*",
        "query": Object {
          "bool": Object {
            "should": Array [
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "slo.id": "first",
                      },
                    },
                    Object {
                      "term": Object {
                        "slo.instanceId": "host-foo",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "slo.id": "second",
                      },
                    },
                    Object {
                      "term": Object {
                        "slo.instanceId": "host-foo",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "slo.id": "third",
                      },
                    },
                    Object {
                      "term": Object {
                        "slo.instanceId": "cluster-eu",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        "wait_for_completion": false,
      }
    `);
    expect(mockEsClient.deleteByQuery.mock.calls[1][0]).toMatchInlineSnapshot(`
      Object {
        "index": ".slo-observability.summary-v3*",
        "query": Object {
          "bool": Object {
            "should": Array [
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "slo.id": "first",
                      },
                    },
                    Object {
                      "term": Object {
                        "slo.instanceId": "host-foo",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "slo.id": "second",
                      },
                    },
                    Object {
                      "term": Object {
                        "slo.instanceId": "host-foo",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "slo.id": "third",
                      },
                    },
                    Object {
                      "term": Object {
                        "slo.instanceId": "cluster-eu",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        "refresh": true,
      }
    `);
  });
});
