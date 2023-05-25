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
import * as uuid from 'uuid';
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
    });

    after(async () => {
      await cleanSavedObjects();
    });

    describe('pagination', () => {
      before(async () => {
        policyIds = await generatePolicies(20);
      });

      after(async () => {
        await cleanSavedObjects();
      });

      it('should return tokens for all policies if number is below default perPage', async () => {
        const response = await supertest.get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN).expect(200);

        const body: GetUninstallTokensResponse = response.body;
        expect(body.total).to.equal(policyIds.length);
        expect(body.page).to.equal(1);
        expect(body.perPage).to.equal(20);

        const receivedPolicyIds = Object.keys(body.items);
        expect(receivedPolicyIds.length).to.equal(policyIds.length);
        policyIds.forEach((policyId) => expect(receivedPolicyIds).to.contain(policyId));
      });

      it('should return default perPage number of tokens if total is above default perPage', async () => {
        policyIds = [...policyIds, ...(await generatePolicies(1))];

        const response1 = await supertest.get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN).expect(200);
        const body1: GetUninstallTokensResponse = response1.body;
        expect(body1.total).to.equal(policyIds.length);
        expect(body1.page).to.equal(1);
        expect(body1.perPage).to.equal(20);
        expect(Object.keys(body1.items).length).to.equal(20);

        const response2 = await supertest
          .get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN)
          .query({ page: 2 })
          .expect(200);
        const body2: GetUninstallTokensResponse = response2.body;
        expect(body2.total).to.equal(policyIds.length);
        expect(body2.page).to.equal(2);
        expect(body2.perPage).to.equal(20);
        expect(Object.keys(body2.items).length).to.equal(1);
      });

      it('should return all tokens via pagination', async () => {
        const receivedPolicyIds: string[] = [];

        for (let i = 1; i <= 4; i++) {
          const response = await supertest
            .get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN)
            .query({
              perPage: 8,
              page: i,
            })
            .expect(200);

          const body: GetUninstallTokensResponse = response.body;
          expect(body.total).to.equal(policyIds.length);
          expect(body.perPage).to.equal(8);
          expect(body.page).to.equal(i);

          const receivedIds = Object.keys(body.items);
          receivedPolicyIds.push(...receivedIds);
        }

        expect(receivedPolicyIds.length).to.equal(policyIds.length);
        policyIds.forEach((policyId) => expect(receivedPolicyIds).to.contain(policyId));
      });
    });

    describe('when `policyId` query param is used', () => {
      before(async () => {
        policyIds = await generatePolicies(5);
      });

      after(async () => {
        await cleanSavedObjects();
      });

      it('should return token for filtered policy if found', async () => {
        const response = await supertest
          .get(UNINSTALL_TOKEN_ROUTES.LIST_PATTERN)
          .query({
            policyId: policyIds[3],
          })
          .expect(200);

        const body: GetUninstallTokensResponse = response.body;
        expect(body.total).to.equal(1);
        expect(body.page).to.equal(1);
        expect(body.perPage).to.equal(20);
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
        expect(body.page).to.equal(1);
        expect(body.perPage).to.equal(20);
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

      it('should return 403 if the user does not have FLEET ALL privilege', async () => {
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
          .send({ name: `Agent Policy ${uuid.v4()}`, namespace: 'default' })
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
