/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  AGENT_POLICY_API_ROUTES,
  CreateAgentPolicyResponse,
  UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import { UNINSTALL_TOKEN_ROUTES } from '@kbn/fleet-plugin/common/constants';
import { GetUninstallTokensResponse } from '@kbn/fleet-plugin/common/types/rest_spec/uninstall_token';
import { testUsers } from '../test_users';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  describe('Uninstall Token API', () => {
    let policyIds: string[];

    before(async () => {
      await cleanSavedObjects();
      policyIds = await generatePolicies(5);
    });

    after(async () => {
      await cleanSavedObjects();
    });

    it('should return tokens for all policies', async () => {
      const response = await supertest.get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN).expect(200);

      const body: GetUninstallTokensResponse = response.body;
      expect(body.total).to.equal(policyIds.length);
      expect(Object.keys(body.items).length).to.equal(policyIds.length);
      policyIds.forEach((policyId) => expect(Object.keys(body.items)).to.contain(policyId));
    });

    describe('when `policyId` query param is used', () => {
      it('should return token for filtered policy if found', async () => {
        const response = await supertest
          .get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN)
          .query({
            policyId: policyIds[3],
          })
          .expect(200);

        const body: GetUninstallTokensResponse = response.body;
        expect(body.total).to.equal(1);
        expect(Object.keys(body.items)).to.eql([policyIds[3]]);
      });

      it('should return nothing if policy is not found', async () => {
        const response = await supertest
          .get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN)
          .query({
            policyId: 'not-existing-policy-id',
          })
          .expect(200);

        const body: GetUninstallTokensResponse = response.body;
        expect(body.total).to.equal(0);
        expect(body.items).to.eql({});
      });
    });

    describe('authorization', () => {
      it('should return 200 if the user has FLEET ALL (and INTEGRATIONS READ) privilege', async () => {
        const { username, password } = testUsers.fleet_all_int_read;

        await supertestWithoutAuth
          .get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN)
          .auth(username, password)
          .expect(200);
      });

      it('should return 403 if the user does not have FLEET ALL privilige', async () => {
        const { username, password } = testUsers.fleet_no_access;

        await supertestWithoutAuth
          .get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN)
          .auth(username, password)
          .expect(403);
      });
    });
  });

  const generatePolicies = async (number: number) => {
    const promises = [];

    for (let i = 0; i < number; i++) {
      promises.push(
        supertest
          .post(AGENT_POLICY_API_ROUTES.LIST_PATTERN)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: `Agent Policy ${i + 1}`, namespace: 'default' })
          .expect(200)
      );
    }

    const responses = await Promise.all(promises);
    const policyIds = responses.map(({ body }) => (body as CreateAgentPolicyResponse).item.id);

    return policyIds;
  };

  const cleanSavedObjects = async () => {
    await kibanaServer.savedObjects.cleanStandardList();
    await kibanaServer.savedObjects.clean({ types: [UNINSTALL_TOKENS_SAVED_OBJECT_TYPE] });
  };
}
