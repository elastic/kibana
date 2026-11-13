/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { updateUnderlyingMapping } from './create_datastream';

const index = 'risk-score.risk-score-default';
const simulatedMapping: MappingTypeMapping = {
  dynamic: 'false',
  properties: { '@timestamp': { type: 'date' } },
};

describe('updateUnderlyingMapping', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      template: { mappings: simulatedMapping, settings: {}, aliases: {} },
    });
  });

  it('skips PUT mappings when every backing index already has the simulated mappings', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      '.ds-risk-score-000001': { mappings: simulatedMapping },
      '.ds-risk-score-000002': { mappings: simulatedMapping },
    });

    await updateUnderlyingMapping({ logger, esClient, index });

    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('PUTs mappings when a backing index has different mappings', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      '.ds-risk-score-000001': { mappings: { dynamic: 'false', properties: {} } },
      '.ds-risk-score-000002': { mappings: simulatedMapping },
    });

    await updateUnderlyingMapping({ logger, esClient, index });

    expect(esClient.indices.putMapping).toHaveBeenCalledWith({ index, ...simulatedMapping });
    expect(logger.info).toHaveBeenCalledWith(`Update mappings for ${index}`);
  });

  it('PUTs mappings when current mappings cannot be read', async () => {
    esClient.indices.getMapping.mockRejectedValue(new Error('boom'));

    await updateUnderlyingMapping({ logger, esClient, index });

    expect(esClient.indices.putMapping).toHaveBeenCalledWith({ index, ...simulatedMapping });
  });
});
