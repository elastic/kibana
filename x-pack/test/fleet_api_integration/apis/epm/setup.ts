/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GetInfoResponse, InstalledRegistry } from '@kbn/fleet-plugin/common/types';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');

  const uninstallPackage = async (name: string, version: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: 'true' });
  };

  describe('setup api', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    after(async () => {
      await uninstallPackage('deprecated', '0.1.0');
      await uninstallPackage('multiple_versions', '0.3.0');
    });
    // FLAKY: https://github.com/elastic/kibana/issues/118479
    describe.skip('setup performs upgrades', async () => {
      const oldEndpointVersion = '0.13.0';
      beforeEach(async () => {
        const url = '/api/fleet/epm/packages/endpoint';
        await supertest.delete(url).set('kbn-xsrf', 'xxxx').send({ force: true }).expect(200);
        await supertest
          .post(`${url}/${oldEndpointVersion}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });
      it('upgrades the endpoint package from 0.13.0 to the latest version available', async function () {
        let { body }: { body: GetInfoResponse } = await supertest
          .get(`/api/fleet/epm/packages/endpoint/${oldEndpointVersion}`)
          .expect(200);
        const latestEndpointVersion = body.item.latestVersion;
        log.info(`Endpoint package latest version: ${latestEndpointVersion}`);
        // make sure we're actually doing an upgrade
        expect(latestEndpointVersion).not.eql(oldEndpointVersion);
        await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

        ({ body } = await supertest
          .get(`/api/fleet/epm/packages/endpoint/${latestEndpointVersion}`)
          .expect(200));
        expect(body.item).to.have.property('savedObject');
        expect((body.item as InstalledRegistry).savedObject.attributes.install_version).to.eql(
          latestEndpointVersion
        );
      });
    });

    describe('package policy upgrade on setup', () => {
      let agentPolicyId: string;
      before(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          });
        agentPolicyId = agentPolicyResponse.item.id;
      });

      after(async function () {
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId });
      });

      it('should upgrade package policy on setup if keep policies up to date set to true', async () => {
        const oldVersion = '0.1.0';
        const latestVersion = '0.3.0';
        const policyName = 'policy-1';
        // first install old version of package
        await supertest
          .post(`/api/fleet/epm/packages/multiple_versions/${oldVersion}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);

        // now set the package to keep policies up to date
        await supertest
          .put(`/api/fleet/epm/packages/multiple_versions/${oldVersion}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ keepPoliciesUpToDate: true })
          .expect(200);

        // create a package policy with the old package version
        await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: policyName,
            namespace: 'default',
            policy_id: agentPolicyId,
            package: { name: 'multiple_versions', version: oldVersion },
            inputs: [],
            force: true,
          })
          .expect(200);

        // install the most recent version of the package
        await supertest
          .post(`/api/fleet/epm/packages/multiple_versions/${latestVersion}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

        // now check the package policy has been upgraded to the latest version
        const { body } = await supertest
          .get('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body.items.find((pkg: any) => pkg.name === policyName).package.version).to.equal(
          latestVersion
        );
      });
    });

    it('does not fail when package is no longer compatible in registry', async () => {
      await supertest
        .post(`/api/fleet/epm/packages/deprecated/0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true, ignore_constraints: true })
        .expect(200);

      const agentPolicyResponse = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'deprecated-ap-1',
          namespace: 'default',
          monitoring_enabled: [],
        })
        .expect(200);

      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'deprecated-1',
          policy_id: agentPolicyResponse.body.item.id,
          package: {
            name: 'deprecated',
            version: '0.1.0',
          },
          inputs: [],
        })
        .expect(200);

      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'xxxx').expect(200);
    });

    it('allows elastic/fleet-server user to call required APIs', async () => {
      const { token } = await es.security.createServiceToken({
        namespace: 'elastic',
        service: 'fleet-server',
      });

      // elastic/fleet-server needs access to these APIs:
      // POST /api/fleet/setup
      // POST /api/fleet/agents/setup
      // GET /api/fleet/agent_policies
      // GET /api/fleet/enrollment_api_keys
      // GET /api/fleet/enrollment_api_keys/<id>
      await supertestWithoutAuth
        .post('/api/fleet/setup')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      await supertestWithoutAuth
        .post('/api/fleet/agents/setup')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      await supertestWithoutAuth
        .get('/api/fleet/agent_policies')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      await supertest
        .post('/api/fleet/agent_policies')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .send({ id: 'policy-1', name: 'Agent policy 1', namespace: 'default' })
        .expect(200);
      await supertestWithoutAuth
        .get('/api/fleet/enrollment_api_keys')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      const response = await supertest
        .post('/api/fleet/enrollment_api_keys')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .send({ policy_id: 'policy-1' })
        .expect(200);
      const enrollmentApiKeyId = response.body.item.id;
      await supertestWithoutAuth
        .get(`/api/fleet/enrollment_api_keys/${enrollmentApiKeyId}`)
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
    });
  });
}
