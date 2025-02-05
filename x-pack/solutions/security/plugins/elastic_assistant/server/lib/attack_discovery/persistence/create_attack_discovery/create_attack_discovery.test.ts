/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { createAttackDiscovery } from './create_attack_discovery';
import { AttackDiscoveryCreateProps, AttackDiscoveryResponse } from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { getAttackDiscovery } from '../get_attack_discovery/get_attack_discovery';
import { loggerMock } from '@kbn/logging-mocks';
const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();
jest.mock('../get_attack_discovery/get_attack_discovery');
const attackDiscoveryCreate: AttackDiscoveryCreateProps = {
  attackDiscoveries: [],
  apiConfig: {
    actionTypeId: 'action-type-id',
    connectorId: 'connector-id',
    defaultSystemPromptId: 'default-prompt-id',
    model: 'model-name',
    provider: 'OpenAI',
  },
  alertsContextCount: 10,
  replacements: { key1: 'value1', key2: 'value2' },
  status: 'running',
};

const user = {
  username: 'test_user',
  profile_uid: '1234',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

const mockArgs = {
  esClient: mockEsClient,
  attackDiscoveryIndex: 'attack-discovery-index',
  spaceId: 'space-1',
  user,
  attackDiscoveryCreate,
  logger: mockLogger,
};
const mockGetAttackDiscovery = jest.mocked(getAttackDiscovery);

describe('createAttackDiscovery', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create attack discovery successfully', async () => {
    // @ts-expect-error not full response interface
    mockEsClient.create.mockResolvedValueOnce({ _id: 'created_id' });
    mockGetAttackDiscovery.mockResolvedValueOnce({
      id: 'created_id',
      // ... other attack discovery properties
    } as AttackDiscoveryResponse);

    const response = await createAttackDiscovery(mockArgs);
    expect(response).not.toBeNull();
    expect(response!.id).toEqual('created_id');
    expect(mockEsClient.create).toHaveBeenCalledTimes(1);
    expect(mockGetAttackDiscovery).toHaveBeenCalledTimes(1);
  });

  it('should throw error on elasticsearch create failure', async () => {
    mockEsClient.create.mockRejectedValueOnce(new Error('Elasticsearch error'));
    await expect(createAttackDiscovery(mockArgs)).rejects.toThrowError('Elasticsearch error');
    expect(mockEsClient.create).toHaveBeenCalledTimes(1);
    expect(mockGetAttackDiscovery).not.toHaveBeenCalled();
  });
});
