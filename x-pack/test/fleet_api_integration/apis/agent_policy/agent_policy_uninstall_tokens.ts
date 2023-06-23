/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UNINSTALL_TOKENS_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { GetUninstallTokensByPolicyIdResponse } from '@kbn/fleet-plugin/common/types/rest_spec/agent_policy';
import { agentPolicyRouteService } from '@kbn/fleet-plugin/common/services';
import { testUsers } from '../test_users';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { addUninstallTokenToPolicy, generateNPolicies } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  describe('Agent Policies Uninstall Tokens', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('GET agent_policy/{agentPolicyId}/uninstall_tokens', () => {
      let generatedPolicyId: string;

      before(async () => {
        generatedPolicyId = (await generateNPolicies(supertest, 1))[0];

        await addUninstallTokenToPolicy(kibanaServer, generatedPolicyId, 'second latest');
        await addUninstallTokenToPolicy(kibanaServer, generatedPolicyId, 'latest');
      });

      after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('should return the decrypted uninstall token(s) on success', async () => {
        const response = await supertest
          .get(agentPolicyRouteService.getUninstallTokensPath(generatedPolicyId))
          .expect(200);

        const body: GetUninstallTokensByPolicyIdResponse = response.body;

        expect(body.items.length).to.equal(body.total);
        expect(body.items[0]).to.have.property('policy_id', generatedPolicyId);
        expect(body.items[0]).to.have.keys('created_at', 'token', 'id');
      });

      it('should return all tokens with the latest on top', async () => {
        const response = await supertest
          .get(agentPolicyRouteService.getUninstallTokensPath(generatedPolicyId))
          .expect(200);

        const body: GetUninstallTokensByPolicyIdResponse = response.body;

        expect(body.total).to.equal(3);
        expect(body.items.length).to.equal(3);

        expect(body.items[0].token).to.equal('latest');
        expect(body.items[1].token).to.equal('second latest');
      });

      it('should return 404 if no uninstall token found', async () => {
        const response = await supertest
          .get(agentPolicyRouteService.getUninstallTokensPath('i-dont-exist'))
          .expect(404);

        expect(response.body).to.have.property('statusCode', 404);
        expect(response.body).to.have.property(
          'message',
          'Uninstall Token not found for Agent Policy i-dont-exist'
        );
      });

      it('should return 500 if token is missing', async () => {
        const savedObjectId = await addUninstallTokenToPolicy(kibanaServer, generatedPolicyId, '');

        const response = await supertest
          .get(agentPolicyRouteService.getUninstallTokensPath(generatedPolicyId))
          .expect(500);

        expect(response.body.message).to.equal('Uninstall Token is missing the token.');

        await kibanaServer.savedObjects.delete({
          type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
          id: savedObjectId,
        });
      });

      describe('authorization', () => {
        it('should return 200 if the user has FLEET ALL (and INTEGRATIONS READ) privilege', async () => {
          const { username, password } = testUsers.fleet_all_int_read;

          await supertestWithoutAuth
            .get(agentPolicyRouteService.getUninstallTokensPath(generatedPolicyId))
            .auth(username, password)
            .expect(200);
        });

        it('should return 403 if the user does not have FLEET ALL privilege', async () => {
          const { username, password } = testUsers.fleet_no_access;

          await supertestWithoutAuth
            .get(agentPolicyRouteService.getUninstallTokensPath(generatedPolicyId))
            .auth(username, password)
            .expect(403);
        });
      });
    });
  });
}
