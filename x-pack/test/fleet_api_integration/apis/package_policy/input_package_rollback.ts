/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';
const PACKAGE_NAME = 'input_package_upgrade';
const START_VERSION = '1.0.0';

const expectIdArraysEqual = (arr1: any[], arr2: any[]) => {
  expect(sortBy(arr1, 'id')).to.eql(sortBy(arr2, 'id'));
};
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = async (name: string, version: string) => {
    return await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const getInstallationSavedObject = async (name: string, version: string) => {
    const res = await supertest.get(`/api/fleet/epm/packages/${name}/${version}`).expect(200);
    return res.body.item.savedObject.attributes;
  };

  const getPackage = async (name: string, version: string) => {
    const res = await supertest.get(`/api/fleet/epm/packages/${name}/${version}`).expect(200);
    return res.body.item;
  };

  const createPackagePolicyWithDataset = async (
    agentPolicyId: string,
    dataset: string,
    expectStatusCode = 200,
    force = false
  ) => {
    const policy = {
      force,
      policy_id: agentPolicyId,
      package: {
        name: PACKAGE_NAME,
        version: START_VERSION,
      },
      name: 'test-policy-' + dataset,
      description: '',
      namespace: 'default',
      inputs: {
        'logs-logfile': {
          enabled: true,
          streams: {
            'input_package_upgrade.logs': {
              enabled: true,
              vars: {
                paths: ['/tmp/test/log'],
                tags: ['tag1'],
                ignore_older: '72h',
                'data_stream.dataset': dataset,
              },
            },
          },
        },
      },
    };
    const res = await supertest
      .post(`/api/fleet/package_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send(policy)
      .expect(expectStatusCode);

    return res.body.item;
  };

  const createAgentPolicy = async (name = 'Input Package Test 3') => {
    const res = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name,
        namespace: 'default',
      })
      .expect(200);
    return res.body.item;
  };

  const deleteAgentPolicy = async (agentPolicyId: string) => {
    if (!agentPolicyId) return;
    return supertest
      .post(`/api/fleet/agent_policies/delete`)
      .set('kbn-xsrf', 'xxxx')
      .send({ agentPolicyId });
  };

  describe('input package policy rollback', async function () {
    skipIfNoDockerRegistry(providerContext);

    let agentPolicyId: string;
    before(async () => {
      const agentPolicy = await createAgentPolicy();
      agentPolicyId = agentPolicy.id;
    });

    after(async () => {
      await deleteAgentPolicy(agentPolicyId);
    });
    setupFleetAndAgents(providerContext);

    it('should rollback package install on package policy create failure', async () => {
      await createPackagePolicyWithDataset(agentPolicyId, 'test*', 400);

      const pkg = await getPackage(PACKAGE_NAME, START_VERSION);
      expect(pkg?.status).to.eql('not_installed');
    });

    it('should not add es references on package policy create failure when package is already installed', async () => {
      await installPackage(PACKAGE_NAME, START_VERSION);
      await createPackagePolicyWithDataset(agentPolicyId, 'test*', 400);

      const installation = await getInstallationSavedObject(PACKAGE_NAME, START_VERSION);
      expectIdArraysEqual(installation.installed_es, []);

      await uninstallPackage(PACKAGE_NAME, START_VERSION);
    });
  });
}
