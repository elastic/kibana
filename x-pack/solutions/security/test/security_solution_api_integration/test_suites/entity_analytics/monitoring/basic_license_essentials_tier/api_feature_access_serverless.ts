/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { privilegeMonitoringRouteHelpersFactory } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const privilegedUserMonitoringRoutes = privilegeMonitoringRouteHelpersFactory(supertest);

  describe('@serverless Essentials Tier API Access', () => {
    it('should not find init engine api', async () => {
      await privilegedUserMonitoringRoutes.init(404);
    });

    it('should not find disable engine api', async () => {
      await privilegedUserMonitoringRoutes.disable(404);
    });

    it('should not find schedule now api', async () => {
      await privilegedUserMonitoringRoutes.scheduleNow(404);
    });

    it('should not find delete engine api', async () => {
      await privilegedUserMonitoringRoutes.delete(404);
    });

    it('should not find health check api', async () => {
      await privilegedUserMonitoringRoutes.healthCheck(404);
    });

    it('should not find privilege check api', async () => {
      await privilegedUserMonitoringRoutes.privilegeCheck(404);
    });

    it('should not find create indices api', async () => {
      await privilegedUserMonitoringRoutes.createIndices({ name: 'test', mode: 'standard' }, 404);
    });

    it('should not find create user api', async () => {
      await privilegedUserMonitoringRoutes.createUser({}, 404);
    });

    it('should not find list users api', async () => {
      await privilegedUserMonitoringRoutes.listUsers(404);
    });

    it('should not find update user api', async () => {
      await privilegedUserMonitoringRoutes.updateUser({}, 404);
    });

    it('should not find upload user CSV api', async () => {
      await privilegedUserMonitoringRoutes.uploadUsersCSV('test', 404);
    });

    it('should not find delete user api', async () => {
      await privilegedUserMonitoringRoutes.deleteUser('test', 404);
    });

    it('should not find privileged access detection install api', async () => {
      await privilegedUserMonitoringRoutes.padInstall(404);
    });

    it('should not find privileged access detection status api', async () => {
      await privilegedUserMonitoringRoutes.padStatus(404);
    });

    it('should not find create source api', async () => {
      await privilegedUserMonitoringRoutes.createSource({ type: 'index', name: 'test' }, 404);
    });

    it('should not find get source api', async () => {
      await privilegedUserMonitoringRoutes.getSource('test', 404);
    });

    it('should not find update source api', async () => {
      await privilegedUserMonitoringRoutes.updateSource('test', {}, 404);
    });

    it('should not find list source api', async () => {
      await privilegedUserMonitoringRoutes.listSource(404);
    });

    it('should not find delete source api', async () => {
      await privilegedUserMonitoringRoutes.deleteSource('test', 404);
    });
  });
};
