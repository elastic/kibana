/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getActionAgentType } from './get_action_agent_type';
import { applyEsClientSearchMock } from '../../../mocks/utils.mock';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';

describe('getActionAgentType()', () => {
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  });

  it('should throw error if action is not found', async () => {
    await expect(getActionAgentType(esClientMock, '123')).rejects.toThrow(
      'Action id [123] not found'
    );
  });

  it('should return agent type', async () => {
    const generator = new EndpointActionGenerator('seed');

    applyEsClientSearchMock({
      esClientMock,
      index: ENDPOINT_ACTIONS_INDEX,
      response: EndpointActionGenerator.toEsSearchResponse([generator.generateActionEsHit()]),
    });

    await expect(getActionAgentType(esClientMock, '123')).resolves.toEqual({
      agentType: 'endpoint',
    });
  });
});
