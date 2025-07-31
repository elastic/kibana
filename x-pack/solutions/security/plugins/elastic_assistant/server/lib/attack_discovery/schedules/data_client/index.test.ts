/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { AttackDiscoveryScheduleDataClient, AttackDiscoveryScheduleDataClientParams } from '.';
import {
  getAttackDiscoveryCreateScheduleMock,
  getAttackDiscoveryUpdateScheduleMock,
  getInternalAttackDiscoveryScheduleMock,
} from '../../../../__mocks__/attack_discovery_schedules.mock';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';

const mockApiConfig = {
  connectorId: 'connector-id',
  actionTypeId: '.bedrock',
  model: 'model',
  name: 'Test Bedrock',
  provider: OpenAiProviderType.OpenAi,
};
const mockBasicScheduleParams = {
  name: 'Test Schedule 1',
  schedule: {
    interval: '10m',
  },
  params: {
    alertsIndexPattern: '.alerts-security.alerts-default',
    apiConfig: mockApiConfig,
    end: 'now',
    size: 25,
    start: 'now-24h',
  },
  enabled: true,
};
const mockInternalAttackDiscovery = getInternalAttackDiscoveryScheduleMock(
  getInternalAttackDiscoveryScheduleMock(mockBasicScheduleParams)
);

describe('AttackDiscoveryScheduleDataClient', () => {
  let scheduleDataClientParams: AttackDiscoveryScheduleDataClientParams;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduleDataClientParams = {
      actionsClient: actionsClientMock.create(),
      logger: loggerMock.create(),
      rulesClient: rulesClientMock.create(),
    };

    (scheduleDataClientParams.rulesClient.find as jest.Mock).mockResolvedValue({
      total: 1,
      data: [mockInternalAttackDiscovery],
    });
    (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(
      mockInternalAttackDiscovery
    );
    (scheduleDataClientParams.rulesClient.create as jest.Mock).mockResolvedValue(
      mockInternalAttackDiscovery
    );
    (scheduleDataClientParams.rulesClient.update as jest.Mock).mockResolvedValue(
      mockInternalAttackDiscovery
    );
  });

  describe('findSchedules', () => {
    it('should call `rulesClient.find` with the correct rule type', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.findSchedules();

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: {
          page: 1,
          ruleTypeIds: ['attack-discovery'],
        },
      });
    });

    it('should call `rulesClient.find` with the correct `page`', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.findSchedules({ page: 10 });

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: {
          page: 11,
          ruleTypeIds: ['attack-discovery'],
        },
      });
    });

    it('should call `rulesClient.find` with the correct `perPage`', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.findSchedules({ perPage: 23 });

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: {
          page: 1,
          perPage: 23,
          ruleTypeIds: ['attack-discovery'],
        },
      });
    });

    it('should call `rulesClient.find` with the correct `sortField`', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.findSchedules({ sort: { sortField: 'name' } });

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: {
          page: 1,
          sortField: 'name',
          ruleTypeIds: ['attack-discovery'],
        },
      });
    });

    it('should call `rulesClient.find` with the correct `sortDirection`', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.findSchedules({ sort: { sortDirection: 'desc' } });

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: {
          page: 1,
          sortOrder: 'desc',
          ruleTypeIds: ['attack-discovery'],
        },
      });
    });
  });

  describe('getSchedule', () => {
    it('should call `rulesClient.get` with the schedule id', async () => {
      const scheduleId = 'schedule-1';
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.getSchedule(scheduleId);

      expect(scheduleDataClientParams.rulesClient.get).toHaveBeenCalledWith({ id: scheduleId });
    });
  });

  describe('createSchedule', () => {
    it('should call `rulesClient.create` with the schedule to create', async () => {
      const scheduleCreateData = getAttackDiscoveryCreateScheduleMock();

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.createSchedule(scheduleCreateData);

      expect(scheduleDataClientParams.rulesClient.create).toHaveBeenCalledWith({
        data: {
          actions: [],
          alertTypeId: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
          consumer: 'siem',
          tags: [],
          ...scheduleCreateData,
        },
      });
    });
  });

  describe('updateSchedule', () => {
    it('should call `rulesClient.update` with the update attributes', async () => {
      const scheduleId = 'schedule-5';
      const scheduleUpdateData = getAttackDiscoveryUpdateScheduleMock(scheduleId, {
        name: 'Updated schedule 5',
      });

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.updateSchedule(scheduleUpdateData);

      expect(scheduleDataClientParams.rulesClient.update).toHaveBeenCalledWith({
        id: scheduleId,
        data: {
          actions: [],
          tags: [],
          ...getAttackDiscoveryCreateScheduleMock(),
          name: 'Updated schedule 5',
        },
      });
    });
  });

  describe('deleteSchedule', () => {
    it('should call `rulesClient.delete` with the schedule id to delete', async () => {
      const scheduleId = 'schedule-3';

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.deleteSchedule({ id: scheduleId });

      expect(scheduleDataClientParams.rulesClient.delete).toHaveBeenCalledWith({ id: scheduleId });
    });
  });

  describe('enableSchedule', () => {
    it('should call `rulesClient.enableRule` with the schedule id to delete', async () => {
      const scheduleId = 'schedule-7';

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.enableSchedule({ id: scheduleId });

      expect(scheduleDataClientParams.rulesClient.enableRule).toHaveBeenCalledWith({
        id: scheduleId,
      });
    });
  });

  describe('disableSchedule', () => {
    it('should call `rulesClient.disableRule` with the schedule id to delete', async () => {
      const scheduleId = 'schedule-8';

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.disableSchedule({ id: scheduleId });

      expect(scheduleDataClientParams.rulesClient.disableRule).toHaveBeenCalledWith({
        id: scheduleId,
      });
    });
  });
});
