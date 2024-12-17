/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRuleMigrationsDataClient } from '../../data/__mocks__/mocks';
import { IntegrationRetriever } from './integration_retriever';

describe('IntegrationRetriever', () => {
  let integrationRetriever: IntegrationRetriever;
  const mockRuleMigrationsDataClient = new MockRuleMigrationsDataClient();
  const mockIntegrationItem = {
    id: '1',
    title: 'Integration 1',
    description: 'Integration 1 description',
    data_streams: [{ dataset: 'test', title: 'dstitle', index_pattern: 'logs-*' }],
    elser_embedding: 'elser_embedding',
  };
  beforeEach(() => {
    integrationRetriever = new IntegrationRetriever(mockRuleMigrationsDataClient);
    mockRuleMigrationsDataClient.integrations.retrieveIntegrations.mockImplementation(
      async (_: string) => {
        return mockIntegrationItem;
      }
    );
  });

  it('should retrieve integrations', async () => {
    const result = await integrationRetriever.getIntegrations('test');

    expect(mockRuleMigrationsDataClient.integrations.retrieveIntegrations).toHaveBeenCalledWith(
      'test'
    );
    expect(result).toEqual(mockIntegrationItem);
  });
});
