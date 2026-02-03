/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { privilegeMonitoringRouteHelpersFactory } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

const licenseMessage = 'Your license does not support this feature.';
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const privilegedUserMonitoringRoutes = privilegeMonitoringRouteHelpersFactory(supertest);

  describe('@ess Basic License API Access', () => {
    it('should not be able to access init engine api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.init(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access disable engine api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.disable(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access schedule now api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.scheduleNow(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access delete engine api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.delete(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access health check api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.healthCheck(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access privilege check api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.privilegeCheck(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access create indices api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.createIndices(
        { name: 'test', mode: 'standard' },
        403
      );
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access create user api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.createUser({}, 403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access list users api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.listUsers(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access update user api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.updateUser({}, 403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access upload user CSV api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.uploadUsersCSV('test', 403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access delete user api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.deleteUser('test', 403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access privileged access detection install api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.padInstall(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access privileged access detection status api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.padStatus(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access create source api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.createSource(
        { type: 'index', name: 'test' },
        403
      );
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access get source api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.getSource('test', 403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access update source api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.updateSource('test', {}, 403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access list source api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.listSource(403);
      expect(response.body.message).toEqual(licenseMessage);
    });

    it('should not be able to access delete source api due to license', async () => {
      const response = await privilegedUserMonitoringRoutes.deleteSource('test', 403);
      expect(response.body.message).toEqual(licenseMessage);
    });
  });
};
