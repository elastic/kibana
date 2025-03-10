/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import { GetSLOGroupings, SLORepository } from '.';
import { createSLO } from './fixtures/slo';
import { createSLORepositoryMock } from './mocks';
import { SloDefinitionClient } from './slo_definition_client';

const DEFAULT_SETTINGS = {
  selectedRemoteClusters: [],
  staleThresholdInHours: 1,
  useAllRemoteClusters: false,
};

describe('Get SLO Instances', () => {
  let repositoryMock: jest.Mocked<SLORepository>;
  let esClientMock: ElasticsearchClientMock;
  let definitionClient: SloDefinitionClient;

  beforeEach(() => {
    repositoryMock = createSLORepositoryMock();
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    definitionClient = new SloDefinitionClient(
      repositoryMock,
      elasticsearchServiceMock.createElasticsearchClient(),
      loggerMock.create()
    );
  });

  it('throws when the SLO is ungrouped', async () => {
    const slo = createSLO({ groupBy: ALL_VALUE });
    repositoryMock.findById.mockResolvedValue(slo);

    const service = new GetSLOGroupings(
      definitionClient,
      esClientMock,
      DEFAULT_SETTINGS,
      'default'
    );

    await expect(
      service.execute(slo.id, {
        instanceId: 'irrelevant',
        groupingKey: 'irrelevant',
      })
    ).rejects.toThrowError('Ungrouped SLO cannot be queried for available groupings');
  });

  it('throws when the provided groupingKey is not part of the SLO groupBy field', async () => {
    const slo = createSLO({ groupBy: ['abc.efg', 'host.name'] });
    repositoryMock.findById.mockResolvedValue(slo);

    const service = new GetSLOGroupings(
      definitionClient,
      esClientMock,
      DEFAULT_SETTINGS,
      'default'
    );

    await expect(
      service.execute(slo.id, {
        instanceId: 'irrelevant',
        groupingKey: 'not.found',
      })
    ).rejects.toThrowError("Provided groupingKey doesn't match the SLO's groupBy field");
  });

  it('throws when the provided instanceId cannot be matched against the SLO grouping keys', async () => {
    const slo = createSLO({ groupBy: ['abc.efg', 'host.name'] });
    repositoryMock.findById.mockResolvedValue(slo);

    const service = new GetSLOGroupings(
      definitionClient,
      esClientMock,
      DEFAULT_SETTINGS,
      'default'
    );

    await expect(
      service.execute(slo.id, {
        instanceId: 'too,many,values',
        groupingKey: 'host.name',
      })
    ).rejects.toThrowError('Provided instanceId does not match the number of grouping keys');
  });
});
