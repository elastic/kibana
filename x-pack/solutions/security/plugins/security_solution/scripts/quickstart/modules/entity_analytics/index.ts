/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { getRiskScoreLatestIndex } from '../../../../common/entity_analytics/risk_engine';

export const getRiskScoreIndexMappings: () => MappingTypeMapping = () => ({
  dynamic: 'false',
  properties: {
    '@timestamp': {
      type: 'date',
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
            },
            notes: {
              type: 'keyword',
            },
          },
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
            },
            notes: {
              type: 'keyword',
            },
          },
        },
      },
    },
  },
});

export const createRiskScoreIndex = async ({ client }: { client: Client }) => {
  const riskScoreIndexName = getRiskScoreLatestIndex();
  await client.indices.create({
    index: riskScoreIndexName,
    mappings: getRiskScoreIndexMappings(),
  });
};

export const addRiskScoreDoc = async ({ client }: { client: Client }) => {
  const riskScoreIndexName = getRiskScoreLatestIndex();
  await client.index({
    index: riskScoreIndexName,
    document: {
      host: {
        name: 'test host',
        risk: { calculated_level: 'low', calculated_score: 21, calculated_score_norm: 51 },
      },
    },
  });
};
