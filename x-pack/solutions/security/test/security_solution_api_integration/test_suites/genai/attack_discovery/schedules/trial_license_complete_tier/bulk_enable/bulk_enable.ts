/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllAttackDiscoverySchedules,
  enableAttackDiscoverySchedulesFeature,
} from '../../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../../utils/apis';
import { getSimpleAttackDiscoverySchedule } from '../../mocks';
import { checkIfScheduleEnabled } from '../../utils/check_schedule_enabled';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @serverlessQA Bulk enable', () => {
    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
    });

    describe('Happy path', () => {
      it('should bulk enable schedules by `id`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const firstSchedule = await apis.create({ schedule: getSimpleAttackDiscoverySchedule() });
        const secondSchedule = await apis.create({ schedule: getSimpleAttackDiscoverySchedule() });

        const result = await apis.bulkEnable({ ids: [firstSchedule.id, secondSchedule.id] });

        expect(result.ids.sort()).toEqual([firstSchedule.id, secondSchedule.id].sort());
        expect(result.total).toEqual(2);
        expect(result.errors).toEqual([]);
        await checkIfScheduleEnabled({ getService, id: firstSchedule.id });
        await checkIfScheduleEnabled({ getService, id: secondSchedule.id });
      });
    });

    describe('Partial results', () => {
      it('should exclude missing schedules from successful ids', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const createdSchedule = await apis.create({ schedule: getSimpleAttackDiscoverySchedule() });

        const result = await apis.bulkEnable({ ids: [createdSchedule.id, 'missing-schedule'] });

        expect(result.ids).toEqual([createdSchedule.id]);
        expect(result.total).toEqual(1);
        expect(result.errors).toEqual([]);
        await checkIfScheduleEnabled({ getService, id: createdSchedule.id });
      });
    });
  });
};
