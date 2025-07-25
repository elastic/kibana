/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  deleteAllAttackDiscoverySchedules,
  enableAttackDiscoverySchedulesFeature,
  getScheduleNotFoundError,
} from '../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../utils/apis';
import { getSimpleAttackDiscoverySchedule } from '../mocks';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @serverlessQA Disable', () => {
    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
    });

    describe('Happy path', () => {
      it('should disable a schedule by `id`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        // Create enabled schedule
        const createdSchedule = await apis.create({
          schedule: getSimpleAttackDiscoverySchedule({ enabled: true }),
        });
        expect(createdSchedule.enabled).toEqual(true);

        // Disable schedule
        await apis.disable({ id: createdSchedule.id });

        // Check that schedule is disabled
        const enabledSchedule = await apis.get({ id: createdSchedule.id });
        expect(enabledSchedule.enabled).toEqual(false);
      });
    });

    describe('Errors handling', () => {
      it('should return a `Not Found` error if schedule does not exist', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const result = await apis.disable({ id: 'disable-test-id', expectedHttpCode: 404 });

        expect(result).toEqual(getScheduleNotFoundError('disable-test-id'));
      });
    });
  });
};
