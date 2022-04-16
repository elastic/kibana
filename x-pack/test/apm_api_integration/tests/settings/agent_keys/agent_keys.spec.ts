/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { first } from 'lodash';
import { PrivilegeType } from '@kbn/apm-plugin/common/privilege_type';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ApmApiError, ApmApiSupertest } from '../../../common/apm_api_supertest';
import { ApmUser } from '../../../common/authentication';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const esClient = getService('es');

  const agentKeyName = 'test';
  const allApplicationPrivileges = [
    PrivilegeType.AGENT_CONFIG,
    PrivilegeType.EVENT,
    PrivilegeType.SOURCEMAP,
  ];

  async function createAgentKey(apiClient: ApmApiSupertest, privileges = allApplicationPrivileges) {
    return await apiClient({
      endpoint: 'POST /api/apm/agent_keys',
      params: {
        body: {
          name: agentKeyName,
          privileges,
        },
      },
    });
  }

  async function invalidateAgentKey(apiClient: ApmApiSupertest, id: string) {
    return await apiClient({
      endpoint: 'POST /internal/apm/api_key/invalidate',
      params: {
        body: { id },
      },
    });
  }

  async function getAgentKeys(apiClient: ApmApiSupertest) {
    return await apiClient({ endpoint: 'GET /internal/apm/agent_keys' });
  }

  registry.when(
    'When the user does not have the required privileges',
    { config: 'basic', archives: [] },
    () => {
      describe('When the user does not have the required cluster privileges', () => {
        it('should return an error when creating an agent key', async () => {
          const error = await expectToReject(() => createAgentKey(apmApiClient.writeUser));
          expect(error.res.status).to.be(500);
          expect(error.res.body.message).contain('is missing the following requested privilege');
        });

        it('should return an error when invalidating an agent key', async () => {
          const error = await expectToReject(() =>
            invalidateAgentKey(apmApiClient.writeUser, agentKeyName)
          );
          expect(error.res.status).to.be(500);
        });

        it('should return an error when getting a list of agent keys', async () => {
          const error = await expectToReject(() => getAgentKeys(apmApiClient.writeUser));
          expect(error.res.status).to.be(500);
        });
      });

      describe('When the user does not have the required application privileges', () => {
        allApplicationPrivileges.map((privilege) => {
          it(`should return an error when creating an agent key with ${privilege} privilege`, async () => {
            const error = await expectToReject(() =>
              createAgentKey(apmApiClient.manageOwnAgentKeysUser, [privilege])
            );
            expect(error.res.status).to.be(500);
            expect(error.res.body.message).contain('is missing the following requested privilege');
          });
        });
      });
    }
  );

  registry.when(
    'When the user has the required privileges',
    { config: 'basic', archives: [] },
    () => {
      afterEach(async () => {
        await esClient.security.invalidateApiKey({
          username: ApmUser.apmManageOwnAndCreateAgentKeys,
        });
      });

      it('should be able to create an agent key', async () => {
        const { status, body } = await createAgentKey(apmApiClient.createAndAllAgentKeysUser);
        expect(status).to.be(200);
        expect(body).to.have.property('agentKey');
        expect(body.agentKey).to.have.property('id');
        expect(body.agentKey).to.have.property('api_key');
        expect(body.agentKey).to.have.property('encoded');
        expect(body.agentKey.name).to.be(agentKeyName);

        const { api_keys: apiKeys } = await esClient.security.getApiKey({});
        expect(
          apiKeys.filter((key) => !key.invalidated && key.metadata?.application === 'apm')
        ).to.have.length(1);
      });

      it('should be able to invalidate an agent key', async () => {
        // Create
        const { body: createAgentKeyBody } = await createAgentKey(
          apmApiClient.createAndAllAgentKeysUser
        );
        const {
          agentKey: { id },
        } = createAgentKeyBody;

        // Invalidate
        const { status, body } = await invalidateAgentKey(
          apmApiClient.createAndAllAgentKeysUser,
          id
        );
        expect(status).to.be(200);
        expect(body).to.have.property('invalidatedAgentKeys');
        expect(body.invalidatedAgentKeys).to.eql([id]);

        // Get
        const { api_keys: apiKeys } = await esClient.security.getApiKey({});
        expect(
          apiKeys.filter((key) => !key.invalidated && key.metadata?.application === 'apm')
        ).to.be.empty();
      });

      it('should be able to get a list of agent keys', async () => {
        // Create
        const { body: createAgentKeyBody } = await createAgentKey(
          apmApiClient.createAndAllAgentKeysUser
        );
        const {
          agentKey: { id },
        } = createAgentKeyBody;

        // Get
        const {
          status,
          body: { agentKeys },
        } = await getAgentKeys(apmApiClient.createAndAllAgentKeysUser);

        expect(status).to.be(200);
        const agentKey = first(agentKeys);
        expect(agentKey?.id).to.be(id);
        expect(agentKey?.name).to.be(agentKeyName);
        expect(agentKey).to.have.property('creation');
        expect(agentKey?.invalidated).to.be(false);
        expect(agentKey).to.have.property('username');
        expect(agentKey).to.have.property('realm');
        expect(agentKey?.metadata.application).to.be('apm');
      });
    }
  );

  async function expectToReject(fn: () => Promise<any>): Promise<ApmApiError> {
    try {
      await fn();
    } catch (e) {
      return e;
    }
    throw new Error(`Expected fn to throw`);
  }
}
