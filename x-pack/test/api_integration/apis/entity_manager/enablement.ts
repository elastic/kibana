/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ERROR_USER_NOT_AUTHORIZED } from '@kbn/entityManager-plugin/common/errors';
import { builtInDefinitions } from '@kbn/entityManager-plugin/server/lib/entities/built_in';
import { EntityDefinitionWithState } from '@kbn/entityManager-plugin/server/lib/entities/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createAdmin, createRuntimeUser } from './helpers/user';
import { Auth, getInstalledDefinitions } from './helpers/request';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertestWithoutAuth');

  const enablementRequest =
    (method: 'get' | 'put' | 'delete') => async (auth: Auth, query?: { [key: string]: any }) => {
      const response = await supertest[method]('/internal/entities/managed/enablement')
        .auth(auth.username, auth.password)
        .query(query)
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(200);
      return response.body;
    };

  const entityDiscoveryState = enablementRequest('get');
  const enableEntityDiscovery = enablementRequest('put');
  const disableEntityDiscovery = enablementRequest('delete');

  describe('Entity discovery enablement', () => {
    let authorizedUser: { username: string; password: string };
    let unauthorizedUser: { username: string; password: string };

    before(async () => {
      [authorizedUser, unauthorizedUser] = await Promise.all([
        createAdmin({ esClient }),
        createRuntimeUser({ esClient }),
      ]);
    });

    describe('with authorized user', () => {
      it('should enable and disable entity discovery', async () => {
        const enableResponse = await enableEntityDiscovery(authorizedUser);
        expect(enableResponse.success).to.eql(true, "authorized user can't enable EEM");

        let definitionsResponse = await getInstalledDefinitions(supertest, authorizedUser);
        expect(definitionsResponse.definitions.length).to.eql(builtInDefinitions.length);
        expect(
          builtInDefinitions.every((builtin) => {
            return definitionsResponse.definitions.find(
              (installedDefinition: EntityDefinitionWithState) => {
                return (
                  installedDefinition.id === builtin.id &&
                  installedDefinition.state.installed &&
                  installedDefinition.state.running
                );
              }
            );
          })
        ).to.eql(true, 'all builtin definitions are not installed/running');

        let stateResponse = await entityDiscoveryState(authorizedUser);
        expect(stateResponse.enabled).to.eql(
          true,
          `EEM is not enabled; response: ${JSON.stringify(stateResponse)}`
        );

        const disableResponse = await disableEntityDiscovery(authorizedUser, { deleteData: false });
        expect(disableResponse.success).to.eql(
          true,
          `authorized user failed to disable EEM; response: ${JSON.stringify(disableResponse)}`
        );

        stateResponse = await entityDiscoveryState(authorizedUser);
        expect(stateResponse.enabled).to.eql(false, 'EEM is not disabled');

        definitionsResponse = await getInstalledDefinitions(supertest, authorizedUser);
        expect(definitionsResponse.definitions).to.eql([]);
      });
    });

    describe('with unauthorized user', () => {
      it('should fail to enable entity discovery', async () => {
        const enableResponse = await enableEntityDiscovery(unauthorizedUser);
        expect(enableResponse.success).to.eql(false, 'unauthorized user can enable EEM');
        expect(enableResponse.reason).to.eql(ERROR_USER_NOT_AUTHORIZED);

        const stateResponse = await entityDiscoveryState(unauthorizedUser);
        expect(stateResponse.enabled).to.eql(false, 'EEM is enabled');

        const definitionsResponse = await getInstalledDefinitions(supertest, unauthorizedUser);
        expect(definitionsResponse.definitions).to.eql([]);
      });

      it('should fail to disable entity discovery', async () => {
        const enableResponse = await enableEntityDiscovery(authorizedUser);
        expect(enableResponse.success).to.eql(true, "authorized user can't enable EEM");

        let disableResponse = await disableEntityDiscovery(unauthorizedUser);
        expect(disableResponse.success).to.eql(false, 'unauthorized user can disable EEM');
        expect(disableResponse.reason).to.eql(ERROR_USER_NOT_AUTHORIZED);

        disableResponse = await disableEntityDiscovery(authorizedUser);
        expect(disableResponse.success).to.eql(true, "authorized user can't disable EEM");
      });
    });
  });
}
