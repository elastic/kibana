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
  const chance = new Chance();
  const kibanaServer = getService('kibanaServer');

  describe('POST /internal/cloud_security_posture/update_rules_config', () => {
    let agentPolicyId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');

      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });
      agentPolicyId = agentPolicyResponse.item.id;
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it(`Should return 500 when package policy id does not exist`, async () => {
      const packagePolicyId = chance.guid();

      const { body: response } = await supertest
        .post(`/internal/cloud_security_posture/update_rules_config`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          package_policy_id: packagePolicyId,
        })
        .expect(500);
      expect(response.error).to.be('Internal Server Error');
      expect(response.message).to.be(`Package policy ${packagePolicyId} not found`);
    });

    it(`Should return 200 for existing package policy id`, async () => {
      const { body: postPackageResponse } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          force: true,
          name: 'cloud_security_posture-1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [],
          package: {
            name: 'cloud_security_posture',
            title: 'Kubernetes Security Posture Management',
            version: '0.0.26', // TODO: Find a method of maintaining the most recent version of the package
          },
        })
        .expect(200);

      const { body: res } = await supertest
        .post(`/internal/cloud_security_posture/update_rules_config`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          package_policy_id: postPackageResponse.item.id,
        })
        .expect(200);

      expect(res.name).to.be('cloud_security_posture-1');
    });
  });
}
