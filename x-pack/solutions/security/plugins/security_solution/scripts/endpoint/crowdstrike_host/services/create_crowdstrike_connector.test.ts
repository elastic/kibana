/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';
import { createCrowdStrikeConnectorIfNeeded } from './create_crowdstrike_connector';
import * as connectorsServices from '../../common/connectors_services';
import * as spaces from '../../common/spaces';
import { CONNECTOR_ID as CROWDSTRIKE_CONNECTOR_ID } from '@kbn/connector-schemas/crowdstrike/constants';
import { createMockConnector } from '@kbn/actions-plugin/server/application/connector/mocks';

jest.mock('../../common/connectors_services');
jest.mock('../../common/spaces');

const mockedConnectorsServices = connectorsServices as jest.Mocked<typeof connectorsServices>;
const mockedSpaces = spaces as jest.Mocked<typeof spaces>;

describe('createCrowdStrikeConnectorIfNeeded', () => {
  let mockKbnClient: jest.Mocked<KbnClient>;
  let mockLog: ReturnType<typeof createToolingLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockKbnClient = {
      request: jest.fn(),
    } as unknown as jest.Mocked<KbnClient>;

    mockLog = createToolingLogger();

    mockedSpaces.fetchActiveSpace.mockResolvedValue({
      id: 'default',
      name: 'Default',
      disabledFeatures: [],
    });
  });

  it('should skip creation if connector already exists', async () => {
    const existingConnector = {
      id: 'existing-connector',
      referenced_by_count: 0,
      name: 'test-connector',
      connector_type_id: 'crowdstrike',
      is_preconfigured: false,
      is_deprecated: false,
      is_system_action: false,
      is_connector_type_deprecated: false,
    };

    mockedConnectorsServices.fetchConnectorByType.mockResolvedValue(existingConnector);

    await createCrowdStrikeConnectorIfNeeded({
      kbnClient: mockKbnClient,
      log: mockLog,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      apiUrl: 'https://api.crowdstrike.com',
    });

    expect(mockedConnectorsServices.fetchConnectorByType).toHaveBeenCalledWith(
      mockKbnClient,
      CROWDSTRIKE_CONNECTOR_ID
    );
    expect(mockedConnectorsServices.createConnector).not.toHaveBeenCalled();
  });

  it('should create new connector if none exists', async () => {
    mockedConnectorsServices.fetchConnectorByType.mockResolvedValue(undefined);
    const newConnector = createMockConnector({
      id: 'new-connector',
      actionTypeId: 'crowdstrike',
      name: 'test-connector',
    });
    mockedConnectorsServices.createConnector.mockResolvedValue(newConnector);

    await createCrowdStrikeConnectorIfNeeded({
      kbnClient: mockKbnClient,
      log: mockLog,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      apiUrl: 'https://api.crowdstrike.com',
    });

    expect(mockedConnectorsServices.createConnector).toHaveBeenCalledWith(mockKbnClient, {
      name: 'CrowdStrike Dev instance (space: default)',
      connector_type_id: CROWDSTRIKE_CONNECTOR_ID,
      config: {
        url: 'https://api.crowdstrike.com',
      },
      secrets: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      },
    });
  });

  it('should use custom name when provided', async () => {
    mockedConnectorsServices.fetchConnectorByType.mockResolvedValue(undefined);
    const newConnector = createMockConnector({
      id: 'new-connector',
      actionTypeId: 'crowdstrike',
      name: 'test-connector',
    });
    mockedConnectorsServices.createConnector.mockResolvedValue(newConnector);

    await createCrowdStrikeConnectorIfNeeded({
      kbnClient: mockKbnClient,
      log: mockLog,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      apiUrl: 'https://api.crowdstrike.com',
      name: 'Custom CrowdStrike Connector',
    });

    expect(mockedConnectorsServices.createConnector).toHaveBeenCalledWith(mockKbnClient, {
      name: 'Custom CrowdStrike Connector',
      connector_type_id: CROWDSTRIKE_CONNECTOR_ID,
      config: {
        url: 'https://api.crowdstrike.com',
      },
      secrets: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      },
    });
  });
});
