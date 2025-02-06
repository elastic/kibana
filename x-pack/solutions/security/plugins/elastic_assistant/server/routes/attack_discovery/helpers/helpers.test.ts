/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';
import moment from 'moment/moment';
import { getAttackDiscoveryStats, updateAttackDiscoveries } from './helpers';
import { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';
import { transformESSearchToAttackDiscovery } from '../../../lib/attack_discovery/persistence/transforms/transforms';
import { getAttackDiscoverySearchEsMock } from '../../../__mocks__/attack_discovery_schema.mock';
import { mockAnonymizedAlerts } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_anonymized_alerts';
import { mockAttackDiscoveries } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_attack_discoveries';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('lodash/fp', () => ({
  uniq: jest.fn((arr) => Array.from(new Set(arr))),
}));

jest.mock('@kbn/securitysolution-es-utils', () => ({
  transformError: jest.fn((err) => err),
}));
jest.mock('@kbn/langchain/server', () => ({
  ActionsClientLlm: jest.fn(),
}));
jest.mock('../../evaluate/utils', () => ({
  getLangSmithTracer: jest.fn().mockReturnValue([]),
}));
jest.mock('../../utils', () => ({
  getLlmType: jest.fn().mockReturnValue('llm-type'),
}));
const findAttackDiscoveryByConnectorId = jest.fn();
const updateAttackDiscovery = jest.fn();
const createAttackDiscovery = jest.fn();
const getAttackDiscovery = jest.fn();
const findAllAttackDiscoveries = jest.fn();
const mockDataClient = {
  findAttackDiscoveryByConnectorId,
  updateAttackDiscovery,
  createAttackDiscovery,
  getAttackDiscovery,
  findAllAttackDiscoveries,
} as unknown as AttackDiscoveryDataClient;

const mockAuthenticatedUser = {
  username: 'user',
  profile_uid: '1234',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

const mockCurrentAd = transformESSearchToAttackDiscovery(getAttackDiscoverySearchEsMock())[0];

describe('helpers', () => {
  const date = '2024-03-28T22:27:28.000Z';
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date(date));
    getAttackDiscovery.mockResolvedValue(mockCurrentAd);
    updateAttackDiscovery.mockResolvedValue({});
  });

  describe('getAttackDiscoveryStats', () => {
    const mockDiscoveries = [
      {
        timestamp: '2024-06-13T17:55:11.360Z',
        id: '8abb49bd-2f5d-43d2-bc2f-dd3c3cab25ad',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-13T17:55:11.360Z',
        updatedAt: '2024-06-17T20:47:57.556Z',
        lastViewedAt: '2024-06-17T20:47:57.556Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'failed',
        alertsContextCount: undefined,
        apiConfig: {
          connectorId: 'my-bedrock-old',
          actionTypeId: '.bedrock',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: [],
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason:
          'ActionsClientLlm: action result status is error: an error occurred while running the action - Response validation failed (Error: [usage.input_tokens]: expected value of type [number] but got [undefined])',
      },
      {
        timestamp: '2024-06-13T17:55:11.360Z',
        id: '9abb49bd-2f5d-43d2-bc2f-dd3c3cab25ad',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-13T17:55:11.360Z',
        updatedAt: '2024-06-17T20:47:57.556Z',
        lastViewedAt: '2024-06-17T20:46:57.556Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'failed',
        alertsContextCount: undefined,
        apiConfig: {
          connectorId: 'my-bedrock-old',
          actionTypeId: '.bedrock',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: [],
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason:
          'ActionsClientLlm: action result status is error: an error occurred while running the action - Response validation failed (Error: [usage.input_tokens]: expected value of type [number] but got [undefined])',
      },
      {
        timestamp: '2024-06-12T19:54:50.428Z',
        id: '745e005b-7248-4c08-b8b6-4cad263b4be0',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-12T19:54:50.428Z',
        updatedAt: '2024-06-17T20:47:27.182Z',
        lastViewedAt: '2024-06-17T20:27:27.182Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'running',
        alertsContextCount: 20,
        apiConfig: {
          connectorId: 'my-gen-ai',
          actionTypeId: '.gen-ai',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: mockCurrentAd.attackDiscoveries,
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason: undefined,
      },
      {
        timestamp: '2024-06-13T17:50:59.409Z',
        id: 'f48da2ca-b63e-4387-82d7-1423a68500aa',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-13T17:50:59.409Z',
        updatedAt: '2024-06-17T20:47:59.969Z',
        lastViewedAt: '2024-06-17T20:47:35.227Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'succeeded',
        alertsContextCount: 20,
        apiConfig: {
          connectorId: 'my-gpt4o-ai',
          actionTypeId: '.gen-ai',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: mockCurrentAd.attackDiscoveries,
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason: undefined,
      },
      {
        timestamp: '2024-06-12T21:18:56.377Z',
        id: '82fced1d-de48-42db-9f56-e45122dee017',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-12T21:18:56.377Z',
        updatedAt: '2024-06-17T20:47:39.372Z',
        lastViewedAt: '2024-06-17T20:47:39.372Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'canceled',
        alertsContextCount: 20,
        apiConfig: {
          connectorId: 'my-bedrock',
          actionTypeId: '.bedrock',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: mockCurrentAd.attackDiscoveries,
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason: undefined,
      },
      {
        timestamp: '2024-06-12T16:44:23.107Z',
        id: 'a4709094-6116-484b-b096-1e8d151cb4b7',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-12T16:44:23.107Z',
        updatedAt: '2024-06-17T20:48:16.961Z',
        lastViewedAt: '2024-06-17T20:47:16.961Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'succeeded',
        alertsContextCount: 0,
        apiConfig: {
          connectorId: 'my-gen-a2i',
          actionTypeId: '.gen-ai',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: [
          ...mockCurrentAd.attackDiscoveries,
          ...mockCurrentAd.attackDiscoveries,
          ...mockCurrentAd.attackDiscoveries,
          ...mockCurrentAd.attackDiscoveries,
        ],
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason: 'steph threw an error',
      },
    ];
    beforeEach(() => {
      findAllAttackDiscoveries.mockResolvedValue(mockDiscoveries);
    });
    it('returns the formatted stats object', async () => {
      const stats = await getAttackDiscoveryStats({
        authenticatedUser: mockAuthenticatedUser,
        dataClient: mockDataClient,
      });
      expect(stats).toEqual([
        {
          hasViewed: true,
          status: 'failed',
          count: 0,
          connectorId: 'my-bedrock-old',
        },
        {
          hasViewed: false,
          status: 'failed',
          count: 0,
          connectorId: 'my-bedrock-old',
        },
        {
          hasViewed: false,
          status: 'running',
          count: 1,
          connectorId: 'my-gen-ai',
        },
        {
          hasViewed: false,
          status: 'succeeded',
          count: 1,
          connectorId: 'my-gpt4o-ai',
        },
        {
          hasViewed: true,
          status: 'canceled',
          count: 1,
          connectorId: 'my-bedrock',
        },
        {
          hasViewed: false,
          status: 'succeeded',
          count: 4,
          connectorId: 'my-gen-a2i',
        },
      ]);
    });
  });

  describe('updateAttackDiscoveries', () => {
    const mockTelemetry = coreMock.createSetup().analytics;
    const mockLogger = loggerMock.create();
    const mockStartTime = moment('2024-03-28T22:27:28.000Z');
    const mockApiConfig = {
      actionTypeId: '.gen-ai',
      connectorId: 'my-gen-ai',
      model: 'gpt-4',
    };
    const mockReplacements = {};

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update attack discovery successfully', async () => {
      getAttackDiscovery.mockResolvedValue(mockCurrentAd);
      updateAttackDiscovery.mockResolvedValue({});

      await updateAttackDiscoveries({
        anonymizedAlerts: mockAnonymizedAlerts,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        attackDiscoveryId: 'attack-discovery-id',
        authenticatedUser: mockAuthenticatedUser,
        dataClient: mockDataClient,
        hasFilter: false,
        end: 'now',
        latestReplacements: mockReplacements,
        logger: mockLogger,
        size: 10,
        start: 'now-24h',
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(updateAttackDiscovery).toHaveBeenCalledWith({
        attackDiscoveryUpdateProps: expect.objectContaining({
          status: 'succeeded',
        }),
        authenticatedUser: mockAuthenticatedUser,
      });
      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
        actionTypeId: '.gen-ai',
        alertsContextCount: 2,
        alertsCount: 8,
        configuredAlertsCount: 10,
        dateRangeDuration: 24,
        discoveriesGenerated: 1,
        durationMs: 0,
        hasFilter: false,
        isDefaultDateRange: true,
        model: 'gpt-4',
      });
    });
    it('should detect non-default time range', async () => {
      getAttackDiscovery.mockResolvedValue(mockCurrentAd);
      updateAttackDiscovery.mockResolvedValue({});

      await updateAttackDiscoveries({
        anonymizedAlerts: mockAnonymizedAlerts,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        attackDiscoveryId: 'attack-discovery-id',
        authenticatedUser: mockAuthenticatedUser,
        dataClient: mockDataClient,
        hasFilter: false,
        end: 'now',
        latestReplacements: mockReplacements,
        logger: mockLogger,
        size: 10,
        start: 'now-1w',
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(updateAttackDiscovery).toHaveBeenCalledWith({
        attackDiscoveryUpdateProps: expect.objectContaining({
          status: 'succeeded',
        }),
        authenticatedUser: mockAuthenticatedUser,
      });
      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
        actionTypeId: '.gen-ai',
        alertsContextCount: 2,
        alertsCount: 8,
        configuredAlertsCount: 10,
        dateRangeDuration: 168,
        discoveriesGenerated: 1,
        durationMs: 0,
        hasFilter: false,
        isDefaultDateRange: false,
        model: 'gpt-4',
      });
    });
    it('hasFilter should be true when filter exists', async () => {
      getAttackDiscovery.mockResolvedValue(mockCurrentAd);
      updateAttackDiscovery.mockResolvedValue({});

      await updateAttackDiscoveries({
        anonymizedAlerts: mockAnonymizedAlerts,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        attackDiscoveryId: 'attack-discovery-id',
        authenticatedUser: mockAuthenticatedUser,
        dataClient: mockDataClient,
        hasFilter: true,
        end: 'now',
        latestReplacements: mockReplacements,
        logger: mockLogger,
        size: 10,
        start: 'now-24h',
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(updateAttackDiscovery).toHaveBeenCalledWith({
        attackDiscoveryUpdateProps: expect.objectContaining({
          status: 'succeeded',
        }),
        authenticatedUser: mockAuthenticatedUser,
      });
      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
        actionTypeId: '.gen-ai',
        alertsContextCount: 2,
        alertsCount: 8,
        configuredAlertsCount: 10,
        dateRangeDuration: 24,
        discoveriesGenerated: 1,
        durationMs: 0,
        hasFilter: true,
        isDefaultDateRange: true,
        model: 'gpt-4',
      });
    });

    it('should handle error during update', async () => {
      const mockError = new Error('Update failed');
      getAttackDiscovery.mockRejectedValue(mockError);

      await updateAttackDiscoveries({
        anonymizedAlerts: mockAnonymizedAlerts,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        attackDiscoveryId: 'attack-discovery-id',
        authenticatedUser: mockAuthenticatedUser,
        dataClient: mockDataClient,
        hasFilter: false,
        end: 'now',
        latestReplacements: mockReplacements,
        logger: mockLogger,
        size: 10,
        start: 'now-24h',
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(mockError);
      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
        'attack_discovery_error',
        expect.any(Object)
      );
    });
  });
});
