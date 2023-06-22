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
import {
  GetUninstallTokensByPolicyIdResponse,
  GetUninstallTokensMetadataResponse,
} from '@kbn/fleet-plugin/common/types/rest_spec/uninstall_token';
import * as uuid from 'uuid';
import { uninstallTokensRouteService } from '@kbn/fleet-plugin/common/services';
import { testUsers } from '../test_users';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  describe('Uninstall Token API', () => {
    let generatedPolicyIds: Set<string>;

    before(async () => {
      await cleanSavedObjects();
    });

    after(async () => {
      await cleanSavedObjects();
    });

    describe('GET uninstall_tokens', () => {
      describe('pagination', () => {
        before(async () => {
          generatedPolicyIds = new Set(await generatePolicies(20));
        });

        after(async () => {
          await cleanSavedObjects();
        });

        it('should return token metadata for all policies if number of policies is below default perPage', async () => {
          const response = await supertest
            .get(uninstallTokensRouteService.getListPath())
            .expect(200);

          const body: GetUninstallTokensMetadataResponse = response.body;
          expect(body.total).to.equal(generatedPolicyIds.size);
          expect(body.page).to.equal(1);
          expect(body.perPage).to.equal(20);

          expect(body.items.length).to.equal(generatedPolicyIds.size);
          body.items.forEach(({ policy_id: policyId }) =>
            expect(generatedPolicyIds.has(policyId)).to.be(true)
          );
        });

        it('should return token metadata with creation date', async () => {
          const response = await supertest
            .get(uninstallTokensRouteService.getListPath())
            .expect(200);

          const body: GetUninstallTokensMetadataResponse = response.body;
          expect(body.items[0]).to.have.property('policy_id');
          expect(body.items[0]).to.have.property('created_at');

          const createdAt = new Date(body.items[0].created_at!).getTime();
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).getTime();

          expect(createdAt).to.lessThan(Date.now()).greaterThan(thirtyMinutesAgo);
        });

        it('should return default perPage number of token metadata if total is above default perPage', async () => {
          generatedPolicyIds.add((await generatePolicies(1))[0]);

          const response1 = await supertest
            .get(uninstallTokensRouteService.getListPath())
            .expect(200);
          const body1: GetUninstallTokensMetadataResponse = response1.body;
          expect(body1.total).to.equal(generatedPolicyIds.size);
          expect(body1.page).to.equal(1);
          expect(body1.perPage).to.equal(20);
          expect(body1.items.length).to.equal(20);

          const response2 = await supertest
            .get(uninstallTokensRouteService.getListPath())
            .query({ page: 2 })
            .expect(200);
          const body2: GetUninstallTokensMetadataResponse = response2.body;
          expect(body2.total).to.equal(generatedPolicyIds.size);
          expect(body2.page).to.equal(2);
          expect(body2.perPage).to.equal(20);
          expect(body2.items.length).to.equal(1);
        });

        it('should return metadata for all tokens via pagination', async () => {
          const receivedPolicyIds: string[] = [];

          for (let i = 1; i <= 4; i++) {
            const response = await supertest
              .get(uninstallTokensRouteService.getListPath())
              .query({
                perPage: 8,
                page: i,
              })
              .expect(200);

            const body: GetUninstallTokensMetadataResponse = response.body;
            expect(body.total).to.equal(generatedPolicyIds.size);
            expect(body.perPage).to.equal(8);
            expect(body.page).to.equal(i);

            const receivedIds = body.items.map(({ policy_id: policyId }) => policyId);
            receivedPolicyIds.push(...receivedIds);
          }

          expect(receivedPolicyIds.length).to.equal(generatedPolicyIds.size);
          receivedPolicyIds.forEach((policyId) =>
            expect(generatedPolicyIds.has(policyId)).to.be(true)
          );
        });

        it('should return token metadata correctly paginated and sorted by their creation date desc', async () => {
          let prevCreatedAt = Date.now();

          for (let i = 1; i <= 4; i++) {
            const response = await supertest
              .get(uninstallTokensRouteService.getListPath())
              .query({
                perPage: 6,
                page: i,
              })
              .expect(200);

            const body: GetUninstallTokensMetadataResponse = response.body;

            body.items.forEach(({ created_at: createdAt }) => {
              const currentCreatedAt = new Date(createdAt!).getTime();

              const isCurrentOlderThanPrevious = currentCreatedAt <= prevCreatedAt;
              expect(isCurrentOlderThanPrevious).to.be(true);

              prevCreatedAt = currentCreatedAt;
            });
          }
        });
      });

      describe('when there are multiple tokens for a policy', () => {
        let generatedPolicyIdsArray: string[];
        let timestampBeforeAddingNewTokens: number;

        before(async () => {
          generatedPolicyIdsArray = await generatePolicies(20);
          generatedPolicyIds = new Set(generatedPolicyIdsArray);

          timestampBeforeAddingNewTokens = Date.now();

          const savingAdditionalTokensPromises = generatedPolicyIdsArray.map((id) =>
            saveAdditionalToken(id, `${id} latest token`)
          );

          await Promise.all(savingAdditionalTokensPromises);
        });

        after(async () => {
          await cleanSavedObjects();
        });

        it("should return only the latest token's metadata for every policy", async () => {
          const response = await supertest
            .get(uninstallTokensRouteService.getListPath())
            .expect(200);

          const body: GetUninstallTokensMetadataResponse = response.body;
          expect(body.total).to.equal(generatedPolicyIds.size);
          expect(body.page).to.equal(1);
          expect(body.perPage).to.equal(20);

          body.items.forEach((uninstallToken) => {
            const createdAt = new Date(uninstallToken.created_at!).getTime();
            expect(createdAt).to.be.greaterThan(timestampBeforeAddingNewTokens);
          });
        });
      });

      describe('when `policyId` query param is used', () => {
        before(async () => {
          generatedPolicyIds = new Set(await generatePolicies(5));
        });

        after(async () => {
          await cleanSavedObjects();
        });

        it('should return token metadata for full policyID if found', async () => {
          const selectedPolicyId = [...generatedPolicyIds][3];

          const response = await supertest
            .get(uninstallTokensRouteService.getListPath())
            .query({
              policyId: selectedPolicyId,
            })
            .expect(200);

          const body: GetUninstallTokensMetadataResponse = response.body;
          expect(body.total).to.equal(1);
          expect(body.page).to.equal(1);
          expect(body.perPage).to.equal(20);
          expect(body.items[0].policy_id).to.equal(selectedPolicyId);
        });

        it('should return token metadata for partial policyID if found', async () => {
          const selectedPolicyId = [...generatedPolicyIds][2];

          const response = await supertest
            .get(uninstallTokensRouteService.getListPath())
            .query({
              policyId: selectedPolicyId.slice(4, 11),
            })
            .expect(200);

          const body: GetUninstallTokensMetadataResponse = response.body;
          expect(body.total).to.equal(1);
          expect(body.page).to.equal(1);
          expect(body.perPage).to.equal(20);
          expect(body.items[0].policy_id).to.equal(selectedPolicyId);
        });

        it('should return nothing if policy is not found', async () => {
          const response = await supertest
            .get(uninstallTokensRouteService.getListPath())
            .query({
              policyId: 'not-existing-policy-id',
            })
            .expect(200);

          const body: GetUninstallTokensMetadataResponse = response.body;
          expect(body.total).to.equal(0);
          expect(body.page).to.equal(1);
          expect(body.perPage).to.equal(20);
          expect(body.items).to.eql([]);
        });
      });

      describe('authorization', () => {
        it('should return 200 if the user has FLEET ALL (and INTEGRATIONS READ) privilege', async () => {
          const { username, password } = testUsers.fleet_all_int_read;

          await supertestWithoutAuth
            .get(uninstallTokensRouteService.getListPath())
            .auth(username, password)
            .expect(200);
        });

        it('should return 403 if the user does not have FLEET ALL privilege', async () => {
          const { username, password } = testUsers.fleet_no_access;

          await supertestWithoutAuth
            .get(uninstallTokensRouteService.getListPath())
            .auth(username, password)
            .expect(403);
        });
      });
    });

    describe('GET uninstall_tokens/{policy_id}', () => {
      let generatedPolicyId: string;

      before(async () => {
        generatedPolicyId = (await generatePolicies(1))[0];

        await saveAdditionalToken(generatedPolicyId, 'second latest');
        await saveAdditionalToken(generatedPolicyId, 'latest');
      });

      after(async () => {
        await cleanSavedObjects();
      });

      it('should return the decrypted uninstall token on success', async () => {
        const response = await supertest
          .get(uninstallTokensRouteService.getInfoPath(generatedPolicyId))
          .expect(200);

        const body: GetUninstallTokensByPolicyIdResponse = response.body;

        expect(body.items.length).to.equal(body.total);
        expect(body.items[0]).to.have.property('policy_id', generatedPolicyId);
        expect(body.items[0]).to.have.keys('created_at', 'token');
      });

      it('should return all tokens with the latest on top', async () => {
        const response = await supertest
          .get(uninstallTokensRouteService.getInfoPath(generatedPolicyId))
          .expect(200);

        const body: GetUninstallTokensByPolicyIdResponse = response.body;

        expect(body.total).to.equal(3);
        expect(body.items.length).to.equal(3);

        expect(body.items[0].token).to.equal('latest');
        expect(body.items[1].token).to.equal('second latest');
      });

      it('should return 404 if no uninstall token found', async () => {
        const response = await supertest
          .get(uninstallTokensRouteService.getInfoPath('i-dont-exist'))
          .expect(404);

        expect(response.body).to.have.property('statusCode', 404);
        expect(response.body).to.have.property(
          'message',
          'Uninstall Token not found for Agent Policy i-dont-exist'
        );
      });

      it('should return 500 if token is missing', async () => {
        const savedObjectId = await saveAdditionalToken(generatedPolicyId, '');

        const response = await supertest
          .get(uninstallTokensRouteService.getInfoPath(generatedPolicyId))
          .expect(500);

        expect(response.body.message).to.equal('Uninstall Token is missing the token.');

        await deleteAdditionalToken(savedObjectId);
      });

      describe('authorization', () => {
        it('should return 200 if the user has FLEET ALL (and INTEGRATIONS READ) privilege', async () => {
          const { username, password } = testUsers.fleet_all_int_read;

          await supertestWithoutAuth
            .get(uninstallTokensRouteService.getInfoPath(generatedPolicyId))
            .auth(username, password)
            .expect(200);
        });

        it('should return 403 if the user does not have FLEET ALL privilege', async () => {
          const { username, password } = testUsers.fleet_no_access;

          await supertestWithoutAuth
            .get(uninstallTokensRouteService.getInfoPath(generatedPolicyId))
            .auth(username, password)
            .expect(403);
        });
      });
    });
  });

  const generatePolicies = async (number: number) => {
    const promises = [];

    for (let i = 0; i < number; i++) {
      promises.push(
        supertest
          .post(AGENT_POLICY_API_ROUTES.CREATE_PATTERN)
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

  const saveAdditionalToken = async (policyId: string, token: string) => {
    const savedObject = await kibanaServer.savedObjects.create({
      type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
      attributes: {
        policy_id: policyId,
        token,
      },
      overwrite: false,
    });

    return savedObject.id;
  };

  const deleteAdditionalToken = async (savedObjectId: string) =>
    kibanaServer.savedObjects.delete({
      type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
      id: savedObjectId,
    });
}
