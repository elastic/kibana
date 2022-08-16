/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import Chance from 'chance';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  // const kibanaServer = getService('kibanaServer');
  const chance = new Chance();

  describe('POST /internal/cloud_security_posture/update_rules_config', () => {
    let agentPolicyId: string;

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

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

    it(`expect error code 500 - package policy not exist`, async () => {
      const packagePolicyId = chance.guid();

      const { body: response } = await supertest
        .post(`/internal/cloud_security_posture/update_rules_config`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          package_policy_id: packagePolicyId,
        })
        .expect(500);
      expect(response.error).to.be('Internal Server Error');
      expect(response.message).to.be(`package policy Id '${packagePolicyId}' is not exist`);
    });

    it(`creates Cloud Posture package policy and execute valid API call to update configuration`, async () => {
      const { body: response } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          force: true,
          name: 'cloud_security_posture-1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'cloud_security_posture',
            title: 'Kubernetes Security Posture Management',
            version: '0.0.26',
          },
        })
        .expect(200);

      await supertest
        .post(`/internal/cloud_security_posture/update_rules_config`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          package_policy_id: response.item.id,
        })
        .expect(200);
    });
  });
}
