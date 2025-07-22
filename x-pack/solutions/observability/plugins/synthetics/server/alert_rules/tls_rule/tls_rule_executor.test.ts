/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { TLSRuleExecutor } from './tls_rule_executor';
import { mockEncryptedSO } from '../../synthetics_service/utils/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import * as locationsUtils from '../../synthetics_service/get_all_locations';
import type { PublicLocation } from '../../../common/runtime_types';
import { SyntheticsServerSetup } from '../../types';
import { randomUUID } from 'node:crypto';
import { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

describe('tlsRuleExecutor', () => {
  const mockEsClient = elasticsearchClientMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const soClient = savedObjectsClientMock.create();
  jest.spyOn(locationsUtils, 'getAllLocations').mockResolvedValue({
    // @ts-ignore
    publicLocations: [
      {
        id: 'us_central_qa',
        label: 'US Central QA',
      },
      {
        id: 'us_central_dev',
        label: 'US Central DEV',
      },
    ] as unknown as PublicLocation,
    privateLocations: [],
  });

  const serverMock: SyntheticsServerSetup = {
    logger,
    syntheticsEsClient: mockEsClient,
    authSavedObjectsClient: soClient,
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    },
    spaces: {
      spacesService: {
        getSpaceId: jest.fn().mockReturnValue('test-space'),
      },
    },
    encryptedSavedObjects: mockEncryptedSO(),
  } as unknown as SyntheticsServerSetup;

  const syntheticsService = new SyntheticsService(serverMock);

  const monitorClient = new SyntheticsMonitorClient(syntheticsService, serverMock);

  const commonFilter =
    'synthetics-monitor-multi-space.attributes.alert.tls.enabled: true and (synthetics-monitor-multi-space.attributes.type: http or synthetics-monitor-multi-space.attributes.type: tcp)';

  const getTLSRuleExecutorParams = (
    ruleParams: TLSRuleParams = {}
  ): [
    Date,
    TLSRuleParams,
    SavedObjectsClientContract,
    ElasticsearchClient,
    SyntheticsServerSetup,
    SyntheticsMonitorClient,
    string,
    string
  ] => [
    moment().toDate(),
    ruleParams,
    soClient,
    mockEsClient,
    serverMock,
    monitorClient,
    'test-space',
    'rule-name',
  ];

  it('should only query enabled monitors', async () => {
    const tlsRule = new TLSRuleExecutor(...getTLSRuleExecutorParams());
    const configRepo = tlsRule.monitorConfigRepository;
    const spy = jest.spyOn(configRepo, 'getAll').mockResolvedValue([]);

    const { certs } = await tlsRule.getExpiredCertificates();

    expect(certs).toEqual([]);

    expect(spy).toHaveBeenCalledWith({
      filter: commonFilter,
    });
  });

  describe('getMonitors', () => {
    it('should filter monitors based on monitor ids', async () => {
      const monitorId = randomUUID();
      const tlsRule = new TLSRuleExecutor(...getTLSRuleExecutorParams({ monitorIds: [monitorId] }));
      const configRepo = tlsRule.monitorConfigRepository;
      const getAllMock = jest.spyOn(configRepo, 'getAll').mockResolvedValue([]);

      await tlsRule.getMonitors();

      expect(getAllMock).toHaveBeenCalledWith({
        filter: `${commonFilter} AND synthetics-monitor-multi-space.attributes.id:(\"${monitorId}\")`,
      });
    });

    it('should filter monitors based on tags', async () => {
      const tag = 'myMonitor';
      const tlsRule = new TLSRuleExecutor(...getTLSRuleExecutorParams({ tags: [tag] }));
      const configRepo = tlsRule.monitorConfigRepository;
      const getAllMock = jest.spyOn(configRepo, 'getAll').mockResolvedValue([]);

      await tlsRule.getMonitors();

      expect(getAllMock).toHaveBeenCalledWith({
        filter: `${commonFilter} AND synthetics-monitor-multi-space.attributes.tags:(\"${tag}\")`,
      });
    });

    it('should filter monitors based on monitor types', async () => {
      const monitorType = 'http';
      const tlsRule = new TLSRuleExecutor(
        ...getTLSRuleExecutorParams({ monitorTypes: [monitorType] })
      );
      const configRepo = tlsRule.monitorConfigRepository;
      const getAllMock = jest.spyOn(configRepo, 'getAll').mockResolvedValue([]);

      await tlsRule.getMonitors();

      expect(getAllMock).toHaveBeenCalledWith({
        filter: `${commonFilter} AND synthetics-monitor-multi-space.attributes.type:(\"${monitorType}\")`,
      });
    });

    it('should filter monitors based on KQL query', async () => {
      const tlsRule = new TLSRuleExecutor(
        ...getTLSRuleExecutorParams({ kqlQuery: 'monitor.type : "tcp" ' })
      );

      await tlsRule.getMonitors();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                {
                  bool: {
                    should: {
                      bool: {
                        should: [{ match_phrase: { 'monitor.type': 'tcp' } }],
                        minimum_should_match: 1,
                      },
                    },
                  },
                },
              ]),
            }),
          }),
        }),
        { meta: true, context: { loggingOptions: { loggerName: 'synthetics' } } }
      );
    });
  });
});
