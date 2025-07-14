/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { enableAttackDiscoverySchedulesFeature } from '../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../utils/apis';
import { getSimpleAttackDiscoverySchedule } from '../mocks';

const getScheduleMissingLicenseError = () => {
  return {
    statusCode: 403,
    error: 'Forbidden',
    message: 'Your license does not support AI Assistant. Please upgrade your license.',
  };
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('@ess @serverless @brokenInServerless Attack Discovery Schedules', () => {
    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    it('returns 403 forbidden error when accessing `create` route', async () => {
      const apis = getAttackDiscoverySchedulesApis({ supertest });

      const result = await apis.create({
        schedule: getSimpleAttackDiscoverySchedule(),
        expectedHttpCode: 403,
      });

      expect(result).toEqual(getScheduleMissingLicenseError());
    });

    it('returns 403 forbidden error when accessing `find` route', async () => {
      const apis = getAttackDiscoverySchedulesApis({ supertest });

      const results = await apis.find({ query: {}, expectedHttpCode: 403 });

      expect(results).toEqual(getScheduleMissingLicenseError());
    });

    it('returns 403 forbidden error when accessing `get` route', async () => {
      const apis = getAttackDiscoverySchedulesApis({ supertest });

      const results = await apis.get({ id: 'test-id-1', expectedHttpCode: 403 });

      expect(results).toEqual(getScheduleMissingLicenseError());
    });

    it('returns 403 forbidden error when accessing `update` route', async () => {
      const apis = getAttackDiscoverySchedulesApis({ supertest });
      const { params, schedule } = getSimpleAttackDiscoverySchedule();

      const results = await apis.update({
        id: 'test-id-1',
        schedule: { name: 'Updated Name', params, schedule, actions: [] },
        expectedHttpCode: 403,
      });

      expect(results).toEqual(getScheduleMissingLicenseError());
    });

    it('returns 403 forbidden error when accessing `delete` route', async () => {
      const apis = getAttackDiscoverySchedulesApis({ supertest });

      const results = await apis.delete({ id: 'test-id-1', expectedHttpCode: 403 });

      expect(results).toEqual(getScheduleMissingLicenseError());
    });

    it('returns 403 forbidden error when accessing `enable` route', async () => {
      const apis = getAttackDiscoverySchedulesApis({ supertest });

      const results = await apis.enable({ id: 'test-id-1', expectedHttpCode: 403 });

      expect(results).toEqual(getScheduleMissingLicenseError());
    });

    it('returns 403 forbidden error when accessing `disable` route', async () => {
      const apis = getAttackDiscoverySchedulesApis({ supertest });

      const results = await apis.disable({ id: 'test-id-1', expectedHttpCode: 403 });

      expect(results).toEqual(getScheduleMissingLicenseError());
    });
  });
};
