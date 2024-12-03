/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ApmAlertsRequiredParams, getApmAlertsClient } from './get_apm_alerts_client';
import type {
  IScopedClusterClient,
  IUiSettingsClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { AlertsClient, RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';

describe('get_apm_alerts_client', () => {
  let ruleRegistryMock: jest.Mocked<RuleRegistryPluginStartContract>;
  let alertClient: jest.Mocked<AlertsClient>;
  let uiSettingsClientMock: jest.Mocked<IUiSettingsClient>;

  const params: ApmAlertsRequiredParams = {
    size: 10,
    track_total_hits: true,
    query: {
      match: { field: 'value' },
    },
  };

  beforeEach(async () => {
    uiSettingsClientMock = {
      get: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IUiSettingsClient>;

    alertClient = {
      find: jest.fn().mockResolvedValue({}),
      getAuthorizedAlertsIndices: jest.fn().mockResolvedValue(['apm']),
    } as unknown as jest.Mocked<AlertsClient>;

    ruleRegistryMock = {
      getRacClientWithRequest: jest.fn().mockResolvedValue(alertClient),
      alerting: jest.fn(),
    } as unknown as jest.Mocked<RuleRegistryPluginStartContract>;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Helper function to create the APM alerts client
  const createApmAlertsClient = async () => {
    return await getApmAlertsClient({
      context: {
        core: Promise.resolve({
          uiSettings: { client: uiSettingsClientMock },
          elasticsearch: { client: {} as IScopedClusterClient },
          savedObjects: { client: {} as SavedObjectsClientContract },
        }),
      } as any,
      plugins: {
        ruleRegistry: {
          start: jest.fn().mockResolvedValue(ruleRegistryMock),
          setup: {} as any,
        },
      } as any,
      request: {} as KibanaRequest,
    });
  };

  it('should call search', async () => {
    const apmAlertsClient = await createApmAlertsClient();

    await apmAlertsClient.search(params);

    const searchParams = alertClient.find.mock.calls[0][0] as ApmAlertsRequiredParams;
    expect(searchParams.query).toEqual({ match: { field: 'value' } });
  });

  it('should call search with filters containing excluded data tiers', async () => {
    const excludedDataTiers = ['data_warm', 'data_cold'];
    uiSettingsClientMock.get.mockResolvedValue(excludedDataTiers);

    const apmAlertsClient = await createApmAlertsClient();

    await apmAlertsClient.search(params);

    const searchParams = alertClient.find.mock.calls[0][0] as ApmAlertsRequiredParams;
    expect(searchParams.query?.bool).toEqual({
      must: [
        { match: { field: 'value' } },
        { bool: { must_not: [{ terms: { _tier: ['data_warm', 'data_cold'] } }] } },
      ],
    });
  });
});
