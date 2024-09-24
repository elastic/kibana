/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FLEET_ELASTIC_AGENT_PACKAGE } from '@kbn/fleet-plugin/common/constants/epm';

import { DASHBOARD_LOCATORS_IDS } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  describe('Install elastic_agent package', () => {
    const { getService } = providerContext;
    const fleetAndAgents = getService('fleetAndAgents');

    skipIfNoDockerRegistry(providerContext);

    const kibanaServer = getService('kibanaServer');
    const supertest = getService('supertest');
    let pkgVersion: string;

    before(async () => {
      await fleetAndAgents.setup();
      const getPkRes = await supertest
        .get(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      pkgVersion = getPkRes.body.item.version;
      // Install latest version of the package
      await supertest
        .post(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}/${pkgVersion}`)
        .send({
          force: true,
        })
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    it('Install elastic agent details dashboard with the correct id', async () => {
      const resDashboard = await kibanaServer.savedObjects.get({
        type: 'dashboard',
        id: DASHBOARD_LOCATORS_IDS.ELASTIC_AGENT_AGENT_METRICS,
      });

      expect(resDashboard.id).to.eql(DASHBOARD_LOCATORS_IDS.ELASTIC_AGENT_AGENT_METRICS);
    });

    after(async () => {
      return supertest
        .delete(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}/${pkgVersion}`)
        .set('kbn-xsrf', 'xxxx');
    });
  });
}
