/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';

import { AttackDiscoveryScheduleDataClient, AttackDiscoveryScheduleDataClientParams } from '.';
import {
  getAttackDiscoveryCreateScheduleMock,
  getAttackDiscoveryUpdateScheduleMock,
} from '../../../../__mocks__/attack_discovery_schedules.mock';

describe('AttackDiscoveryScheduleDataClient', () => {
  let scheduleDataClientParams: AttackDiscoveryScheduleDataClientParams;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduleDataClientParams = {
      rulesClient: rulesClientMock.create(),
    };
  });

  describe('findSchedules', () => {
    it('should call `rulesClient.find` with the correct filter', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      await scheduleDataClient.findSchedules();

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: { filter: `alert.attributes.alertTypeId: attack-discovery` },
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
        data: scheduleCreateData,
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
        data: { ...getAttackDiscoveryCreateScheduleMock(), name: 'Updated schedule 5' },
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
