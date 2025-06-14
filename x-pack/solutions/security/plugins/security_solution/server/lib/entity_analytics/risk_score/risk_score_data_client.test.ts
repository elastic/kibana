/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createOrUpdateComponentTemplate,
  createOrUpdateIndexTemplate,
} from '@kbn/alerting-plugin/server';
import {
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { RiskScoreDataClient } from './risk_score_data_client';

import { createDataStream } from '../utils/create_datastream';

import * as transforms from '../utils/transforms';
import { createOrUpdateIndex } from '../utils/create_or_update_index';

jest.mock('@kbn/alerting-plugin/server', () => ({
  createOrUpdateComponentTemplate: jest.fn(),
  createOrUpdateIndexTemplate: jest.fn(),
}));

jest.mock('../utils/create_datastream', () => ({
  createDataStream: jest.fn(),
}));

jest.mock('../utils/create_or_update_index', () => ({
  createOrUpdateIndex: jest.fn(),
}));

jest.spyOn(transforms, 'createTransform').mockResolvedValue(Promise.resolve());
jest.spyOn(transforms, 'scheduleTransformNow').mockResolvedValue(Promise.resolve());

let logger: ReturnType<typeof loggingSystemMock.createLogger>;
const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
const totalFieldsLimit = 1000;

describe('RiskScoreDataClient', () => {
  let riskScoreDataClient: RiskScoreDataClient;
  let riskScoreDataClientWithNameSpace: RiskScoreDataClient;
  let riskScoreDataClientWithLongNameSpace: RiskScoreDataClient;
  let mockSavedObjectClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    mockSavedObjectClient = savedObjectsClientMock.create();
    const options = {
      logger,
      kibanaVersion: '8.9.0',
      esClient,
      soClient: mockSavedObjectClient,
      namespace: 'default',
    };
    riskScoreDataClient = new RiskScoreDataClient(options);
    const optionsWithNamespace = { ...options, namespace: 'space-1' };
    riskScoreDataClientWithNameSpace = new RiskScoreDataClient(optionsWithNamespace);
    const optionsWithLongNamespace = { ...options, namespace: 'a_a-'.repeat(200) };
    riskScoreDataClientWithLongNameSpace = new RiskScoreDataClient(optionsWithLongNamespace);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWriter', () => {
    it('should return a writer object', async () => {
      const writer = await riskScoreDataClient.getWriter({ namespace: 'default' });
      expect(writer).toBeDefined();
      expect(typeof writer?.bulk).toBe('function');
    });

    it('should cache and return the same writer for the same namespace', async () => {
      const writer1 = await riskScoreDataClient.getWriter({ namespace: 'default' });
      const writer2 = await riskScoreDataClient.getWriter({ namespace: 'default' });
      const writer3 = await riskScoreDataClient.getWriter({ namespace: 'space-1' });

      expect(writer1).toEqual(writer2);
      expect(writer2).not.toEqual(writer3);
    });
  });

  describe('init success', () => {
    it('should initialize risk engine resources in the appropriate space', async () => {
      // Default namespace
      esClient.cluster.existsComponentTemplate.mockResolvedValue(false);
      await riskScoreDataClient.init();
      assertComponentTemplate('default');
      assertIndexTemplate('default');
      assertDataStream('default');
      assertIndex('default');
      assertTransform('default');

      // Space-1 namespace
      esClient.cluster.existsComponentTemplate.mockResolvedValue(false);
      await riskScoreDataClientWithNameSpace.init();
      assertComponentTemplate('space-1');
      assertIndexTemplate('space-1');
      assertDataStream('space-1');
      assertIndex('space-1');
      assertTransform('space-1');

      // Space with more than 36 characters
      await riskScoreDataClientWithLongNameSpace.init();
      assertTransform('a_a-'.repeat(200));

      expect(
        (createOrUpdateComponentTemplate as jest.Mock).mock.lastCall[0].template.template
      ).toMatchSnapshot();
    });
  });

  describe('init error', () => {
    it('should handle errors during initialization', async () => {
      const error = new Error('There error');
      (createOrUpdateIndexTemplate as jest.Mock).mockRejectedValueOnce(error);

      try {
        await riskScoreDataClient.init();
      } catch (e) {
        expect(logger.error).toHaveBeenCalledWith(
          `Error initializing risk engine resources: ${error.message}`
        );
      }
    });
  });
  describe('upgrade process', () => {
    it('upserts the configuration for the latest risk score index when upgrading', async () => {
      await riskScoreDataClient.upgradeIfNeeded();

      expect(esClient.indices.putMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          dynamic: 'false',
        })
      );
    });
  });

  describe('tearDown', () => {
    it('deletes all resources', async () => {
      const errors = await riskScoreDataClient.tearDown();

      expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(1);
      expect(esClient.indices.deleteDataStream).toHaveBeenCalledTimes(1);
      expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledTimes(1);
      expect(esClient.cluster.deleteComponentTemplate).toHaveBeenCalledTimes(2);
      expect(errors).toEqual([]);
    });

    it('returns errors when promises are rejected', async () => {
      const error = new Error('test error');

      esClient.transform.deleteTransform.mockRejectedValueOnce(error);
      esClient.indices.deleteDataStream.mockRejectedValueOnce(error);
      esClient.indices.deleteIndexTemplate.mockRejectedValueOnce(error);
      esClient.cluster.deleteComponentTemplate.mockRejectedValueOnce(error);

      const errors = await riskScoreDataClient.tearDown();

      expect(errors).toEqual([error, error, error, error]);
    });
  });
});

const assertComponentTemplate = (namespace: string) => {
  expect(createOrUpdateComponentTemplate).toHaveBeenCalledWith(
    expect.objectContaining({
      logger,
      esClient,
      template: expect.objectContaining({
        name: `.risk-score-mappings-${namespace}`,
        _meta: {
          managed: true,
        },
      }),
      totalFieldsLimit: 1000,
    })
  );
};

const assertIndexTemplate = (namespace: string) => {
  expect(createOrUpdateIndexTemplate).toHaveBeenCalledWith({
    logger,
    esClient,
    template: expect.objectContaining({
      name: `.risk-score.risk-score-${namespace}-index-template`,
      data_stream: { hidden: true },
      index_patterns: [`risk-score.risk-score-${namespace}`],
      composed_of: [`.risk-score-mappings-${namespace}`],
    }),
  });
};

const assertDataStream = (namespace: string) => {
  expect(createDataStream).toHaveBeenCalledWith({
    logger,
    esClient,
    totalFieldsLimit,
    indexPatterns: {
      template: `.risk-score.risk-score-${namespace}-index-template`,
      alias: `risk-score.risk-score-${namespace}`,
    },
  });
};

const assertIndex = (namespace: string) => {
  expect(createOrUpdateIndex).toHaveBeenCalledWith({
    logger,
    esClient,
    options: {
      index: `risk-score.risk-score-latest-${namespace}`,
      mappings: {
        dynamic: false,
        properties: {
          '@timestamp': {
            ignore_malformed: false,
            type: 'date',
          },
          event: {
            properties: {
              ingested: {
                type: 'date',
              },
            },
          },
          host: {
            properties: {
              name: {
                type: 'keyword',
              },
              risk: {
                properties: {
                  calculated_level: {
                    type: 'keyword',
                  },
                  calculated_score: {
                    type: 'float',
                  },
                  calculated_score_norm: {
                    type: 'float',
                  },
                  category_1_count: {
                    type: 'long',
                  },
                  category_1_score: {
                    type: 'float',
                  },
                  id_field: {
                    type: 'keyword',
                  },
                  id_value: {
                    type: 'keyword',
                  },
                  notes: {
                    type: 'keyword',
                  },
                  inputs: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      index: {
                        type: 'keyword',
                      },
                      category: {
                        type: 'keyword',
                      },
                      description: {
                        type: 'keyword',
                      },
                      risk_score: {
                        type: 'float',
                      },
                      timestamp: {
                        type: 'date',
                      },
                    },
                    type: 'object',
                  },
                },
                type: 'object',
              },
            },
          },
          service: {
            properties: {
              name: {
                type: 'keyword',
              },
              risk: {
                properties: {
                  calculated_level: {
                    type: 'keyword',
                  },
                  calculated_score: {
                    type: 'float',
                  },
                  calculated_score_norm: {
                    type: 'float',
                  },
                  category_1_count: {
                    type: 'long',
                  },
                  category_1_score: {
                    type: 'float',
                  },
                  id_field: {
                    type: 'keyword',
                  },
                  id_value: {
                    type: 'keyword',
                  },
                  inputs: {
                    properties: {
                      category: {
                        type: 'keyword',
                      },
                      description: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      index: {
                        type: 'keyword',
                      },
                      risk_score: {
                        type: 'float',
                      },
                      timestamp: {
                        type: 'date',
                      },
                    },
                    type: 'object',
                  },
                  notes: {
                    type: 'keyword',
                  },
                },
                type: 'object',
              },
            },
          },
          user: {
            properties: {
              name: {
                type: 'keyword',
              },
              risk: {
                properties: {
                  calculated_level: {
                    type: 'keyword',
                  },
                  calculated_score: {
                    type: 'float',
                  },
                  calculated_score_norm: {
                    type: 'float',
                  },
                  category_1_count: {
                    type: 'long',
                  },
                  category_1_score: {
                    type: 'float',
                  },
                  id_field: {
                    type: 'keyword',
                  },
                  id_value: {
                    type: 'keyword',
                  },
                  notes: {
                    type: 'keyword',
                  },
                  inputs: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      index: {
                        type: 'keyword',
                      },
                      category: {
                        type: 'keyword',
                      },
                      description: {
                        type: 'keyword',
                      },
                      risk_score: {
                        type: 'float',
                      },
                      timestamp: {
                        type: 'date',
                      },
                    },
                    type: 'object',
                  },
                },
                type: 'object',
              },
            },
          },
        },
      },
      settings: {
        'index.default_pipeline': null,
      },
    },
  });
};

const assertTransform = (namespace: string) => {
  expect(transforms.createTransform).toHaveBeenCalledWith({
    logger,
    esClient,
    transform: {
      dest: {
        index: `risk-score.risk-score-latest-${namespace}`,
      },
      frequency: '1h',
      latest: {
        sort: '@timestamp',
        unique_key: ['host.name', 'user.name', 'service.name'],
      },
      source: {
        index: [`risk-score.risk-score-${namespace}`],
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: 'now-24h',
                  },
                },
              },
            ],
          },
        },
      },
      sync: {
        time: {
          delay: '0s',
          field: '@timestamp',
        },
      },
      transform_id: transforms.getLatestTransformId(namespace),
      settings: {
        unattended: true,
      },
      _meta: {
        version: 3,
        managed: true,
        managed_by: 'security-entity-analytics',
        space_id: namespace,
      },
    },
  });
};
