/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { AttackDiscoveryScheduleDataClientParams } from '.';
import { AttackDiscoveryScheduleDataClient } from '.';
import {
  getAttackDiscoveryCreateScheduleMock,
  getAttackDiscoveryUpdateScheduleMock,
  getInternalAttackDiscoveryScheduleMock,
} from '../__mocks__/attack_discovery_schedules.mock';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';

const mockApiConfig = {
  connectorId: 'connector-id',
  actionTypeId: '.bedrock',
  model: 'model',
  name: 'Test Bedrock',
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
    it('calls `rulesClient.find` with the correct rule type', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);

      await scheduleDataClient.findSchedules();

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: {
          page: 1,
          ruleTypeIds: ['attack-discovery'],
        },
      });
    });

    it('calls `rulesClient.find` with the correct `page`', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);

      await scheduleDataClient.findSchedules({ page: 10 });

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: {
          page: 11,
          ruleTypeIds: ['attack-discovery'],
        },
      });
    });

    it('calls `rulesClient.find` with the correct `perPage`', async () => {
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

    it('calls `rulesClient.find` with the correct `sortField`', async () => {
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

    it('calls `rulesClient.find` with the correct `sortDirection`', async () => {
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

    it('calls `rulesClient.find` with a tag filter when filterTags.includeTags is set', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        filterTags: { includeTags: ['workflow:orchestrator'] },
      });

      await scheduleDataClient.findSchedules();

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: {
          filter: 'alert.attributes.tags: "workflow:orchestrator"',
          page: 1,
          ruleTypeIds: ['attack-discovery'],
        },
      });
    });

    it('calls `rulesClient.find` with an exclude tag filter when filterTags.excludeTags is set', async () => {
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        filterTags: { excludeTags: ['workflow:orchestrator'] },
      });

      await scheduleDataClient.findSchedules();

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: {
          filter: 'NOT alert.attributes.tags: "workflow:orchestrator"',
          page: 1,
          ruleTypeIds: ['attack-discovery'],
        },
      });
    });
  });

  describe('getSchedule', () => {
    it('calls `rulesClient.get` with the schedule id', async () => {
      const scheduleId = 'schedule-1';
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);

      await scheduleDataClient.getSchedule(scheduleId);

      expect(scheduleDataClientParams.rulesClient.get).toHaveBeenCalledWith({ id: scheduleId });
    });
  });

  describe('createSchedule', () => {
    it('calls `rulesClient.create` with the schedule to create', async () => {
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

    it('sets tags from applyTags when creating', async () => {
      const scheduleCreateData = getAttackDiscoveryCreateScheduleMock();
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        applyTags: ['attack-discovery-schedule'],
      });

      await scheduleDataClient.createSchedule(scheduleCreateData);

      expect(scheduleDataClientParams.rulesClient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tags: ['attack-discovery-schedule'],
        }),
      });
    });

    it('does NOT use filterTags.includeTags as write-time tags when applyTags is absent', async () => {
      const scheduleCreateData = getAttackDiscoveryCreateScheduleMock();
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        filterTags: { includeTags: ['workflow:orchestrator'] },
      });

      await scheduleDataClient.createSchedule(scheduleCreateData);

      expect(scheduleDataClientParams.rulesClient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tags: [],
        }),
      });
    });

    it('applyTags and filterTags operate independently', async () => {
      const scheduleCreateData = getAttackDiscoveryCreateScheduleMock();
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        applyTags: ['attack-discovery-schedule'],
        filterTags: { excludeTags: ['attack-discovery-workflow'] },
      });

      await scheduleDataClient.createSchedule(scheduleCreateData);

      expect(scheduleDataClientParams.rulesClient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tags: ['attack-discovery-schedule'],
        }),
      });

      await scheduleDataClient.findSchedules();

      expect(scheduleDataClientParams.rulesClient.find).toHaveBeenCalledWith({
        options: expect.objectContaining({
          filter: 'NOT alert.attributes.tags: "attack-discovery-workflow"',
        }),
      });
    });
  });

  describe('updateSchedule', () => {
    it('calls `rulesClient.update` with the update attributes', async () => {
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

    it('sets tags from applyTags when updating', async () => {
      const scheduleId = 'schedule-5';
      const scheduleUpdateData = getAttackDiscoveryUpdateScheduleMock(scheduleId, {
        name: 'Updated schedule 5',
      });
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        applyTags: ['attack-discovery-schedule'],
      });

      await scheduleDataClient.updateSchedule(scheduleUpdateData);

      expect(scheduleDataClientParams.rulesClient.update).toHaveBeenCalledWith({
        id: scheduleId,
        data: expect.objectContaining({
          tags: ['attack-discovery-schedule'],
        }),
      });
    });

    it('calls `rulesClient.get` with the schedule id before calling `rulesClient.update`', async () => {
      const scheduleId = 'schedule-5';
      const scheduleUpdateData = getAttackDiscoveryUpdateScheduleMock(scheduleId, {});
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);
      const callOrder: string[] = [];

      (scheduleDataClientParams.rulesClient.get as jest.Mock).mockImplementation(() => {
        callOrder.push('get');
        return Promise.resolve(mockInternalAttackDiscovery);
      });
      (scheduleDataClientParams.rulesClient.update as jest.Mock).mockImplementation(() => {
        callOrder.push('update');
        return Promise.resolve(mockInternalAttackDiscovery);
      });

      await scheduleDataClient.updateSchedule(scheduleUpdateData);

      expect(callOrder).toEqual(['get', 'update']);
    });

    it('merges existing tags with applyTags additively', async () => {
      const scheduleId = 'schedule-5';
      const scheduleUpdateData = getAttackDiscoveryUpdateScheduleMock(scheduleId, {});

      (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(
        getInternalAttackDiscoveryScheduleMock(mockBasicScheduleParams, { tags: ['pre-ff-tag'] })
      );

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        applyTags: ['attack-discovery-schedule'],
      });

      await scheduleDataClient.updateSchedule(scheduleUpdateData);

      expect(scheduleDataClientParams.rulesClient.update).toHaveBeenCalledWith({
        id: scheduleId,
        data: expect.objectContaining({
          tags: ['pre-ff-tag', 'attack-discovery-schedule'],
        }),
      });
    });

    it('deduplicates tags when the existing rule already has an applyTag', async () => {
      const scheduleId = 'schedule-5';
      const scheduleUpdateData = getAttackDiscoveryUpdateScheduleMock(scheduleId, {});

      (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(
        getInternalAttackDiscoveryScheduleMock(mockBasicScheduleParams, {
          tags: ['attack-discovery-schedule'],
        })
      );

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        applyTags: ['attack-discovery-schedule'],
      });

      await scheduleDataClient.updateSchedule(scheduleUpdateData);

      expect(scheduleDataClientParams.rulesClient.update).toHaveBeenCalledWith({
        id: scheduleId,
        data: expect.objectContaining({
          tags: ['attack-discovery-schedule'],
        }),
      });
    });

    it('preserves existing tags when applyTags is empty (public API behavior)', async () => {
      const scheduleId = 'schedule-5';
      const scheduleUpdateData = getAttackDiscoveryUpdateScheduleMock(scheduleId, {});

      (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(
        getInternalAttackDiscoveryScheduleMock(mockBasicScheduleParams, {
          tags: ['pre-ff-tag'],
        })
      );

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        applyTags: [],
      });

      await scheduleDataClient.updateSchedule(scheduleUpdateData);

      expect(scheduleDataClientParams.rulesClient.update).toHaveBeenCalledWith({
        id: scheduleId,
        data: expect.objectContaining({
          tags: ['pre-ff-tag'],
        }),
      });
    });

    it('preserves existing tags when applyTags is undefined', async () => {
      const scheduleId = 'schedule-5';
      const scheduleUpdateData = getAttackDiscoveryUpdateScheduleMock(scheduleId, {});

      (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(
        getInternalAttackDiscoveryScheduleMock(mockBasicScheduleParams, {
          tags: ['pre-ff-tag'],
        })
      );

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        applyTags: undefined,
      });

      await scheduleDataClient.updateSchedule(scheduleUpdateData);

      expect(scheduleDataClientParams.rulesClient.update).toHaveBeenCalledWith({
        id: scheduleId,
        data: expect.objectContaining({
          tags: ['pre-ff-tag'],
        }),
      });
    });

    it('preserves multiple existing tags when merging with applyTags', async () => {
      const scheduleId = 'schedule-5';
      const scheduleUpdateData = getAttackDiscoveryUpdateScheduleMock(scheduleId, {});

      (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(
        getInternalAttackDiscoveryScheduleMock(mockBasicScheduleParams, {
          tags: ['tag-a', 'tag-b'],
        })
      );

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        applyTags: ['attack-discovery-schedule'],
      });

      await scheduleDataClient.updateSchedule(scheduleUpdateData);

      expect(scheduleDataClientParams.rulesClient.update).toHaveBeenCalledWith({
        id: scheduleId,
        data: expect.objectContaining({
          tags: ['tag-a', 'tag-b', 'attack-discovery-schedule'],
        }),
      });
    });

    it('removes all duplicate tags when multiple applyTags overlap with existing tags', async () => {
      const scheduleId = 'schedule-5';
      const scheduleUpdateData = getAttackDiscoveryUpdateScheduleMock(scheduleId, {});

      (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(
        getInternalAttackDiscoveryScheduleMock(mockBasicScheduleParams, {
          tags: ['tag-a', 'tag-b', 'tag-c'],
        })
      );

      const scheduleDataClient = new AttackDiscoveryScheduleDataClient({
        ...scheduleDataClientParams,
        applyTags: ['tag-b', 'tag-c', 'tag-d'],
      });

      await scheduleDataClient.updateSchedule(scheduleUpdateData);

      expect(scheduleDataClientParams.rulesClient.update).toHaveBeenCalledWith({
        id: scheduleId,
        data: expect.objectContaining({
          tags: ['tag-a', 'tag-b', 'tag-c', 'tag-d'],
        }),
      });
    });
  });

  describe('deleteSchedule', () => {
    it('calls `rulesClient.delete` with the schedule id to delete', async () => {
      const scheduleId = 'schedule-3';
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);

      await scheduleDataClient.deleteSchedule({ id: scheduleId });

      expect(scheduleDataClientParams.rulesClient.delete).toHaveBeenCalledWith({ id: scheduleId });
    });
  });

  describe('enableSchedule', () => {
    it('calls `rulesClient.enableRule` with the schedule id', async () => {
      const scheduleId = 'schedule-7';
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);

      await scheduleDataClient.enableSchedule({ id: scheduleId });

      expect(scheduleDataClientParams.rulesClient.enableRule).toHaveBeenCalledWith({
        id: scheduleId,
      });
    });
  });

  describe('disableSchedule', () => {
    it('calls `rulesClient.disableRule` with the schedule id', async () => {
      const scheduleId = 'schedule-8';
      const scheduleDataClient = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);

      await scheduleDataClient.disableSchedule({ id: scheduleId });

      expect(scheduleDataClientParams.rulesClient.disableRule).toHaveBeenCalledWith({
        id: scheduleId,
      });
    });
  });

  describe('by-ID isolation guard (filterTags)', () => {
    const publicFilterTags = {
      excludeTags: ['attack-discovery-schedule', 'attack-discovery-workflow'],
    };
    const taggedRule = getInternalAttackDiscoveryScheduleMock(mockBasicScheduleParams, {
      tags: ['attack-discovery-workflow'],
    });
    const untaggedRule = getInternalAttackDiscoveryScheduleMock(mockBasicScheduleParams, {
      tags: [],
    });

    describe('getSchedule', () => {
      it('throws a 404 when the public client reads a workflow-tagged schedule by id', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(taggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await expect(client.getSchedule('schedule-1')).rejects.toMatchObject({
          output: { statusCode: 404 },
        });
      });

      it('returns the schedule when the public client reads an untagged schedule by id', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(untaggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await expect(client.getSchedule('schedule-1')).resolves.toEqual(
          expect.objectContaining({ id: expect.any(String) })
        );
      });

      it('returns a workflow-tagged schedule when the internal client (no filterTags) reads by id', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(taggedRule);
        const client = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);

        await expect(client.getSchedule('schedule-1')).resolves.toEqual(
          expect.objectContaining({ id: expect.any(String) })
        );
      });

      it('throws a 404 when an includeTags filter is not satisfied', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(untaggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: { includeTags: ['attack-discovery-schedule'] },
        });

        await expect(client.getSchedule('schedule-1')).rejects.toMatchObject({
          output: { statusCode: 404 },
        });
      });
    });

    describe('updateSchedule', () => {
      it('throws a 404 for a workflow-tagged schedule (public client)', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(taggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await expect(
          client.updateSchedule(getAttackDiscoveryUpdateScheduleMock('schedule-1', {}))
        ).rejects.toMatchObject({ output: { statusCode: 404 } });
      });

      it('does not call `rulesClient.update` when the guard rejects', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(taggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await client
          .updateSchedule(getAttackDiscoveryUpdateScheduleMock('schedule-1', {}))
          .catch(() => {});

        expect(scheduleDataClientParams.rulesClient.update).not.toHaveBeenCalled();
      });
    });

    describe('deleteSchedule', () => {
      it('does not fetch the rule when filterTags is absent (internal client)', async () => {
        const client = new AttackDiscoveryScheduleDataClient(scheduleDataClientParams);

        await client.deleteSchedule({ id: 'schedule-1' });

        expect(scheduleDataClientParams.rulesClient.get).not.toHaveBeenCalled();
      });

      it('throws a 404 for a workflow-tagged schedule (public client)', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(taggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await expect(client.deleteSchedule({ id: 'schedule-1' })).rejects.toMatchObject({
          output: { statusCode: 404 },
        });
      });

      it('does not call `rulesClient.delete` when the guard rejects', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(taggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await client.deleteSchedule({ id: 'schedule-1' }).catch(() => {});

        expect(scheduleDataClientParams.rulesClient.delete).not.toHaveBeenCalled();
      });

      it('deletes an untagged schedule (public client)', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(untaggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await client.deleteSchedule({ id: 'schedule-1' });

        expect(scheduleDataClientParams.rulesClient.delete).toHaveBeenCalledWith({
          id: 'schedule-1',
        });
      });
    });

    describe('enableSchedule / disableSchedule', () => {
      it('throws a 404 when enabling a workflow-tagged schedule (public client)', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(taggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await expect(client.enableSchedule({ id: 'schedule-1' })).rejects.toMatchObject({
          output: { statusCode: 404 },
        });
      });

      it('does not call `rulesClient.enableRule` when the guard rejects', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(taggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await client.enableSchedule({ id: 'schedule-1' }).catch(() => {});

        expect(scheduleDataClientParams.rulesClient.enableRule).not.toHaveBeenCalled();
      });

      it('throws a 404 when disabling a workflow-tagged schedule (public client)', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(taggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await expect(client.disableSchedule({ id: 'schedule-1' })).rejects.toMatchObject({
          output: { statusCode: 404 },
        });
      });

      it('enables an untagged schedule (public client)', async () => {
        (scheduleDataClientParams.rulesClient.get as jest.Mock).mockResolvedValue(untaggedRule);
        const client = new AttackDiscoveryScheduleDataClient({
          ...scheduleDataClientParams,
          filterTags: publicFilterTags,
        });

        await client.enableSchedule({ id: 'schedule-1' });

        expect(scheduleDataClientParams.rulesClient.enableRule).toHaveBeenCalledWith({
          id: 'schedule-1',
        });
      });
    });
  });
});
