/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

import {
  UpgradePackagePolicyDryRunResponse,
  UpgradePackagePolicyResponse,
} from '../../../../plugins/fleet/common';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const esArchiver = getService('esArchiver');

  const server = dockerServers.get('registry');
  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('Package Policy - upgrade', async function () {
    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;
    let packagePolicyId: string;

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    setupFleetAndAgents(providerContext);

    before(async function () {
      if (!server.enabled) {
        return;
      }
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;

      const { body: packagePolicyResponse } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'multiple_versions_1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'multiple_versions',
            title: 'This is a test package for installing or updating a package',
            version: '0.1.0',
          },
        });

      packagePolicyId = packagePolicyResponse.item.id;
    });

    after(async function () {
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('when package is installed', async function () {
      before(async function () {
        await supertest
          .post(`/api/fleet/epm/packages/multiple_versions-0.3.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });

      after(async function () {
        await supertest
          .delete(`/api/fleet/epm/packages/multiple_version-0.3.0`)
          .set('kbn-xsrf', 'xxxx');
      });

      it('should return valid diff when "dryRun: true" is provided', async function () {
        const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
          .post(`/api/fleet/package_policies/upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packagePolicyIds: [packagePolicyId],
            dryRun: true,
          })
          .expect(200);

        expect(body.length).to.be(1);
        expect(body[0].diff?.length).to.be(2);
        expect(body[0].hasErrors).to.be(false);

        const [currentPackagePolicy, proposedPackagePolicy] = body[0].diff ?? [];

        expect(currentPackagePolicy?.package?.version).to.be('0.1.0');
        expect(proposedPackagePolicy?.package?.version).to.be('0.3.0');
      });

      it('should upgrade package policy when "dryRun: false" is provided', async function () {
        const { body }: { body: UpgradePackagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies/upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packagePolicyIds: [packagePolicyId],
            dryRun: false,
          })
          .expect(200);

        expect(body.length).to.be(1);
        expect(body[0].success).to.be(true);
      });
    });

    describe('when no package policy is not found', function () {
      it('should return an 200 with errors when "dryRun:true" is provided', async function () {
        const { body }: { body: UpgradePackagePolicyDryRunResponse } = await supertest
          .post(`/api/fleet/package_policies/upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packagePolicyIds: ['xxxx', 'yyyy'],
            dryRun: true,
          })
          .expect(200);

        expect(body[0].hasErrors).to.be(true);
        expect(body[1].hasErrors).to.be(true);
      });

      it('should return a 200 with errors and "success:false" when "dryRun:false" is provided', async function () {
        const { body }: { body: UpgradePackagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies/upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packagePolicyIds: ['xxxx', 'yyyy'],
            dryRun: false,
          })
          .expect(200);

        expect(body[0].success).to.be(false);
        expect(body[1].success).to.be(false);
      });
    });
  });
}
