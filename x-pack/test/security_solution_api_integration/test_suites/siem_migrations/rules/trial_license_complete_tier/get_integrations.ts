/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { ruleMigrationRouteHelpersFactory } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const migrationRulesRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('Get Integrations', () => {
    it('should return all integrations successfully', async () => {
      const response = await migrationRulesRoutes.getIntegrations({});

      const integrationsObj = response.body;
      const integrationIds = Object.keys(integrationsObj);

      expect(integrationIds.length).to.be.greaterThan(0);
      expect(integrationsObj[integrationIds[0]]).to.have.keys('package', 'version');
    });
  });
};
