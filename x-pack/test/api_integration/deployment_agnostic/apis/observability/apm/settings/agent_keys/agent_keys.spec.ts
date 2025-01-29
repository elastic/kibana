/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { PrivilegeType, ClusterPrivilegeType } from '@kbn/apm-plugin/common/privilege_type';
import type { RoleCredentials } from '../../../../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { expectToReject } from '../../../../../../../apm_api_integration/common/utils/expect_to_reject';
import type { ApmApiError } from '../../../../../services/apm_api';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const samlAuth = getService('samlAuth');

  const agentKeyName = 'test';
  const allApplicationPrivileges = [PrivilegeType.AGENT_CONFIG, PrivilegeType.EVENT];
  const clusterPrivileges = [ClusterPrivilegeType.MANAGE_OWN_API_KEY];

  async function createAgentKey(roleAuthc: RoleCredentials) {
    return await apmApiClient.publicApi({
      endpoint: 'POST /api/apm/agent_keys 2023-10-31',
      params: {
        body: {
          name: agentKeyName,
          privileges: allApplicationPrivileges,
        },
      },
      roleAuthc,
    });
  }

  async function invalidateAgentKey(id: string) {
    return await apmApiClient.writeUser({
      endpoint: 'POST /internal/apm/api_key/invalidate',
      params: {
        body: { id },
      },
    });
  }

  async function getAgentKeys() {
    return await apmApiClient.writeUser({ endpoint: 'GET /internal/apm/agent_keys' });
  }

  describe('When the user does not have the required privileges', () => {
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('When the user does not have the required cluster privileges', () => {
      it('should return an error when creating an agent key', async () => {
        const error = await expectToReject<ApmApiError>(() => createAgentKey(roleAuthc));
        expect(error.res.status).to.be(403);
        expect(error.res.body.message).contain('is missing the following requested privilege');
        expect(error.res.body.attributes).to.eql({
          _inspect: [],
          data: {
            missingPrivileges: allApplicationPrivileges,
            missingClusterPrivileges: clusterPrivileges,
          },
        });
      });

      it('should return an error when invalidating an agent key', async () => {
        const error = await expectToReject<ApmApiError>(() => invalidateAgentKey(agentKeyName));
        expect(error.res.status).to.be(500);
      });

      it('should return an error when getting a list of agent keys', async () => {
        const error = await expectToReject<ApmApiError>(() => getAgentKeys());
        expect(error.res.status).to.be(500);
      });
    });
  });
}
