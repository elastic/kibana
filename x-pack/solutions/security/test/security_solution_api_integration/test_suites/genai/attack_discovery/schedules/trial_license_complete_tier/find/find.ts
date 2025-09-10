/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createAttackDiscoverySchedules,
  deleteAllAttackDiscoverySchedules,
  enableAttackDiscoverySchedulesFeature,
} from '../../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../../utils/apis';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @serverlessQA Find', () => {
    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
    });

    describe('Happy path', () => {
      it('should return empty array if there are no existing schedules', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const results = await apis.find({ query: {} });
        expect(results).toEqual({ data: [], total: 0 });
      });

      it('should return all existing schedules', async () => {
        const schedulesCount = 5;
        const { createdSchedules } = await createAttackDiscoverySchedules({
          count: schedulesCount,
          supertest,
        });
        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const results = await apis.find({ query: {} });
        expect(results).toEqual({
          data: expect.arrayContaining(createdSchedules),
          total: schedulesCount,
        });
      });

      it('should return correct schedules for the specified page', async () => {
        const schedulesCount = 5;
        await createAttackDiscoverySchedules({ count: schedulesCount, supertest });

        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const allSchedules = await apis.find({ query: {} });

        const results = await apis.find({ query: { page: 1, perPage: 2 } });
        expect(results).toEqual({
          data: expect.arrayContaining(allSchedules.data.slice(2, 4)),
          total: schedulesCount,
        });
      });

      it('should return existing schedules in ascending order', async () => {
        const schedulesCount = 5;
        const { scheduleToCreate } = await createAttackDiscoverySchedules({
          count: schedulesCount,
          supertest,
        });

        // Sort names in ascending order
        const scheduleNames = scheduleToCreate.map((schedule) => schedule.name).sort();

        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const results = await apis.find({ query: { sortField: 'name', sortDirection: 'asc' } });
        const resultsNames = (results.data as Array<{ name: string }>).map(({ name }) => name);

        expect(resultsNames).toEqual(scheduleNames);
      });

      it('should return existing schedules in descending order', async () => {
        const schedulesCount = 5;
        const { scheduleToCreate } = await createAttackDiscoverySchedules({
          count: schedulesCount,
          supertest,
        });

        // Sort names in descending order
        const scheduleNames = scheduleToCreate
          .map((schedule) => schedule.name)
          .sort()
          .reverse();

        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const results = await apis.find({ query: { sortField: 'name', sortDirection: 'desc' } });
        const resultsNames = (results.data as Array<{ name: string }>).map(({ name }) => name);

        expect(resultsNames).toEqual(scheduleNames);
      });
    });
  });
};
