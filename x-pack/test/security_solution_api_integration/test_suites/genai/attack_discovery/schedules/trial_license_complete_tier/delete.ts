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

  describe('@ess @serverless @serverlessQA Delete', () => {
    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
    });

    describe('Happy path', () => {
      it('should delete a schedule by `id`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const createdSchedule = await apis.create({ schedule: getSimpleAttackDiscoverySchedule() });

        const deleteResult = await apis.delete({ id: createdSchedule.id });
        expect(deleteResult).toEqual({ id: createdSchedule.id });

        const result = await apis.get({ id: createdSchedule.id, expectedHttpCode: 404 });
        expect(result).toEqual(getScheduleNotFoundError(createdSchedule.id));
      });
    });

    describe('Errors handling', () => {
      it('should return a `Not Found` error if schedule does not exist', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const result = await apis.delete({ id: 'test-id-2', expectedHttpCode: 404 });

        expect(result).toEqual(getScheduleNotFoundError('test-id-2'));
      });
    });
  });
};
