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
  getScheduleBadRequestError,
  getScheduleNotFoundError,
} from '../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../utils/apis';
import { getSimpleAttackDiscoverySchedule } from '../mocks';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @serverlessQA Update', () => {
    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
    });

    describe('Happy path', () => {
      it('should update a schedule', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const scheduleToCreate = getSimpleAttackDiscoverySchedule();
        const createdSchedule = await apis.create({ schedule: scheduleToCreate });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: createdSchedule.schedule,
          actions: createdSchedule.actions,
          name: 'Updated Schedule',
        };
        const updatedSchedule = await apis.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
        });

        expect(updatedSchedule).toEqual(expect.objectContaining(scheduleToUpdate));
      });
    });

    describe('Errors handling', () => {
      it('should return `Not Found` error if schedule does not exist', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const scheduleToCreate = getSimpleAttackDiscoverySchedule();
        const createdSchedule = await apis.create({ schedule: scheduleToCreate });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: createdSchedule.schedule,
          actions: createdSchedule.actions,
          name: 'Updated Schedule',
        };
        const result = await apis.update({
          id: 'fake-schedule-1',
          schedule: scheduleToUpdate,
          expectedHttpCode: 404,
        });

        expect(result).toEqual(getScheduleNotFoundError('fake-schedule-1'));
      });

      it('should return a `Bad Request` error if `name` attribute is `undefined`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const scheduleToCreate = getSimpleAttackDiscoverySchedule();
        const createdSchedule = await apis.create({ schedule: scheduleToCreate });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: createdSchedule.schedule,
          actions: createdSchedule.actions,
          name: undefined,
        };
        const result = await apis.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
          expectedHttpCode: 400,
        });

        expect(result).toEqual(getScheduleBadRequestError('name'));
      });

      it('should return a `Bad Request` error if `params` attribute is `undefined`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const scheduleToCreate = getSimpleAttackDiscoverySchedule();
        const createdSchedule = await apis.create({ schedule: scheduleToCreate });

        const scheduleToUpdate = {
          params: undefined,
          schedule: createdSchedule.schedule,
          actions: createdSchedule.actions,
          name: 'Updated Schedule',
        };
        const result = await apis.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
          expectedHttpCode: 400,
        });

        expect(result).toEqual(getScheduleBadRequestError('params'));
      });

      it('should return a `Bad Request` error if `schedule` attribute is `undefined`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const scheduleToCreate = getSimpleAttackDiscoverySchedule();
        const createdSchedule = await apis.create({ schedule: scheduleToCreate });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: undefined,
          actions: createdSchedule.actions,
          name: 'Updated Schedule',
        };
        const result = await apis.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
          expectedHttpCode: 400,
        });

        expect(result).toEqual(getScheduleBadRequestError('schedule'));
      });

      it('should return a `Bad Request` error if `actions` attribute is `undefined`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const scheduleToCreate = getSimpleAttackDiscoverySchedule();
        const createdSchedule = await apis.create({ schedule: scheduleToCreate });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: createdSchedule.schedule,
          actions: undefined,
          name: 'Updated Schedule',
        };
        const result = await apis.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
          expectedHttpCode: 400,
        });

        expect(result).toEqual(getScheduleBadRequestError('actions'));
      });
    });
  });
};
