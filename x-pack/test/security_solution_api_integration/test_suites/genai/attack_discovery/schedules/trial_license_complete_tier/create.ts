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
} from '../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../utils/apis';
import { getSimpleAttackDiscoverySchedule } from '../mocks';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @serverlessQA Create', () => {
    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
    });

    describe('Happy path', () => {
      it('should create a new schedule for the current user', async () => {
        const username = await utils.getUsername();
        const apis = getAttackDiscoverySchedulesApis({ supertest });

        const schedule = await apis.create({ schedule: getSimpleAttackDiscoverySchedule() });

        expect(schedule).toEqual(
          expect.objectContaining({
            ...getSimpleAttackDiscoverySchedule(),
            createdBy: username,
            updatedBy: username,
          })
        );
      });

      it('should create a new schedule with `enabled` defaulted to `false`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const schedule = await apis.create({
          schedule: { ...getSimpleAttackDiscoverySchedule(), enabled: undefined },
        });
        expect(schedule).toEqual(expect.objectContaining({ enabled: false }));
      });

      it('should create a new schedule with actions defaulted to an empty array', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const schedule = await apis.create({
          schedule: { ...getSimpleAttackDiscoverySchedule(), actions: undefined },
        });
        expect(schedule).toEqual(expect.objectContaining({ actions: [] }));
      });
    });

    describe('Errors handling', () => {
      it('should return a `Bad Request` error if `name` attribute is `undefined`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const result = await apis.create({
          schedule: { ...getSimpleAttackDiscoverySchedule(), name: undefined },
          expectedHttpCode: 400,
        });
        expect(result).toEqual(getScheduleBadRequestError('name'));
      });

      it('should return a `Bad Request` error if `params` attribute is `undefined`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const result = await apis.create({
          schedule: { ...getSimpleAttackDiscoverySchedule(), params: undefined },
          expectedHttpCode: 400,
        });
        expect(result).toEqual(getScheduleBadRequestError('params'));
      });

      it('should return a `Bad Request` error if `schedule` attribute is `undefined`', async () => {
        const apis = getAttackDiscoverySchedulesApis({ supertest });
        const result = await apis.create({
          schedule: { ...getSimpleAttackDiscoverySchedule(), schedule: undefined },
          expectedHttpCode: 400,
        });
        expect(result).toEqual(getScheduleBadRequestError('schedule'));
      });
    });
  });
};
