/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

import {
  UpgradePackagePolicyDryRunResponse,
  UpgradePackagePolicyResponse,
} from '../../../../plugins/fleet/common';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Package Policy - upgrade', async function () {
    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;
    let packagePolicyId: string;

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    setupFleetAndAgents(providerContext);

    describe('when package is installed', function () {
      before(async function () {
        await supertest
          .post(`/api/fleet/epm/packages/package_policy_upgrade-0.3.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });

      after(async function () {
        await supertest
          .delete(`/api/fleet/epm/packages/package_policy_upgrade-0.3.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });

      after(async () => {
        await getService('esArchiver').unload('x-pack/test/functional/es_archives/empty_kibana');
        await getService('esArchiver').unload(
          'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
        );
      });

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              version: '0.1.0',
            },
          })
          .expect(200);

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
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

    describe('when upgrading to a version where an input has been removed', function () {
      before(async function () {
        await supertest
          .post(`/api/fleet/epm/packages/package_policy_upgrade-0.3.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });

      after(async function () {
        await supertest
          .delete(`/api/fleet/epm/packages/package_policy_upgrade-0.3.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });

      beforeEach(async function () {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          })
          .expect(200);

        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'package_policy_upgrade_1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            output_id: '',
            inputs: [
              {
                policy_template: 'package_policy_upgrade',
                type: 'test_input',
                enabled: true,
                streams: [
                  {
                    id: 'test-package_policy_upgrade-xxxx',
                    enabled: true,
                    data_stream: {
                      type: 'test_stream',
                      dataset: 'package_policy_upgrade.test_stream',
                    },
                    vars: {
                      test_var: {
                        value: 'Test Value',
                      },
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'package_policy_upgrade',
              title: 'This is a test package for upgrading package policies',
              // The upgrade from `0.2.0` to `0.3.0` incurs an error state because a breaking
              // change exists between these test package version
              version: '0.2.0',
            },
          });

        packagePolicyId = packagePolicyResponse.item.id;
      });

      afterEach(async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);

        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      });

      describe('when "dryRun: true" is provided', function () {
        it('should return a diff with no errors', async function () {
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
        });
      });

      describe('when "dryRun: false" is provided', function () {
        it('should succeed', async function () {
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
