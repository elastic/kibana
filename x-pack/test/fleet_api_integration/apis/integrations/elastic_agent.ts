/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_ELASTIC_AGENT_DETAILS_DASHBOARD_ID,
} from '@kbn/fleet-plugin/common/constants/epm';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  describe('Install elastic_agent package', () => {
    const { getService } = providerContext;
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    const kibanaServer = getService('kibanaServer');
    const supertest = getService('supertest');
    const dockerServers = getService('dockerServers');
    const server = dockerServers.get('registry');

    let pkgVersion: string;

    before(async () => {
      if (!server.enabled) return;
      const getPkRes = await supertest
        .get(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      pkgVersion = getPkRes.body.item.version;
      // pkgVersion
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
        id: FLEET_ELASTIC_AGENT_DETAILS_DASHBOARD_ID,
      });

      expect(resDashboard.id).to.eql(FLEET_ELASTIC_AGENT_DETAILS_DASHBOARD_ID);
    });

    after(async () => {
      if (!server.enabled) return;
      return supertest
        .delete(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}/${pkgVersion}`)
        .set('kbn-xsrf', 'xxxx');
    });
  });
}
