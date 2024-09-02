/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import expect from '@kbn/expect';
import { builtInDefinitions } from '@kbn/entityManager-plugin/server/lib/entities/built_in';
import { ERROR_API_KEY_NOT_FOUND } from '@kbn/entityManager-plugin/public';
import { builtInEntityDefinition as mockBuiltInEntityDefinition } from '@kbn/entityManager-plugin/server/lib/entities/helpers/fixtures';
import { EntityDefinition } from '@kbn/entities-schema';
import { EntityDefinitionWithState } from '@kbn/entityManager-plugin/server/lib/entities/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createAdmin, createRuntimeUser } from './helpers/user';
import { Auth, getInstalledDefinitions, upgradeBuiltinDefinitions } from './helpers/request';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const enablementRequest =
    (method: 'get' | 'put' | 'delete') =>
    async (auth: Auth, expectedCode: number, query: { [key: string]: any } = {}) => {
      const response = await supertestWithoutAuth[method]('/internal/entities/managed/enablement')
        .auth(auth.username, auth.password)
        .query(query)
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(expectedCode);
      return response.body;
    };

  const entityDiscoveryState = enablementRequest('get');
  const enableEntityDiscovery = enablementRequest('put');
  const disableEntityDiscovery = enablementRequest('delete');

  const expectNoInstalledDefinitions = async () => {
    const definitionsResponse = await getInstalledDefinitions(supertest);
    expect(definitionsResponse.definitions).to.eql([]);
  };

  const isInstalledAndRunning = (
    definition: EntityDefinition,
    installedDefinitions: EntityDefinitionWithState[]
  ) => {
    return installedDefinitions.find((installedDefinition) => {
      return (
        installedDefinition.id === definition.id &&
        installedDefinition.version === definition.version &&
        installedDefinition.state.installed &&
        installedDefinition.state.running
      );
    });
  };

  describe('Entity discovery builtin definitions', () => {
    let authorizedUser: { username: string; password: string };
    let unauthorizedUser: { username: string; password: string };

    before(async () => {
      [authorizedUser, unauthorizedUser] = await Promise.all([
        createAdmin({ esClient }),
        createRuntimeUser({ esClient }),
      ]);
    });

    describe('enablement/disablement', () => {
      describe('with authorized user', () => {
        it('should enable and disable entity discovery', async () => {
          const enableResponse = await enableEntityDiscovery(authorizedUser, 200);
          expect(enableResponse.success).to.eql(true, "authorized user can't enable EEM");

          const definitionsResponse = await getInstalledDefinitions(supertestWithoutAuth, {
            auth: authorizedUser,
          });
          expect(definitionsResponse.definitions.length).to.eql(builtInDefinitions.length);
          expect(
            builtInDefinitions.every((builtin) =>
              isInstalledAndRunning(builtin, definitionsResponse.definitions)
            )
          ).to.eql(true, 'all builtin definitions are not installed/running');

          let stateResponse = await entityDiscoveryState(authorizedUser, 200);
          expect(stateResponse.enabled).to.eql(
            true,
            `EEM is not enabled; response: ${JSON.stringify(stateResponse)}`
          );

          const disableResponse = await disableEntityDiscovery(authorizedUser, 200, {
            deleteData: true,
          });
          expect(disableResponse.success).to.eql(
            true,
            `authorized user failed to disable EEM; response: ${JSON.stringify(disableResponse)}`
          );

          stateResponse = await entityDiscoveryState(authorizedUser, 200);
          expect(stateResponse.enabled).to.eql(false, 'EEM is not disabled');

          await expectNoInstalledDefinitions();
        });
      });

      describe('with unauthorized user', () => {
        it('should fail to enable entity discovery', async () => {
          await enableEntityDiscovery(unauthorizedUser, 403);

          const stateResponse = await entityDiscoveryState(unauthorizedUser, 200);
          expect(stateResponse.enabled).to.eql(false, 'EEM is enabled');

          await expectNoInstalledDefinitions();
        });

        it('should fail to disable entity discovery', async () => {
          const enableResponse = await enableEntityDiscovery(authorizedUser, 200);
          expect(enableResponse.success).to.eql(true, "authorized user can't enable EEM");

          await disableEntityDiscovery(unauthorizedUser, 403);

          const disableResponse = await disableEntityDiscovery(authorizedUser, 200, {
            deleteData: true,
          });
          expect(disableResponse.success).to.eql(true, "authorized user can't disable EEM");
        });
      });
    });

    describe('upgrade', () => {
      it('should noop when no api key stored', async () => {
        const result = await upgradeBuiltinDefinitions(supertest, []);
        expect(result).to.eql({ success: false, reason: ERROR_API_KEY_NOT_FOUND });
      });

      it('should upgrade existing definitions', async () => {
        await expectNoInstalledDefinitions();

        const enableResponse = await enableEntityDiscovery(authorizedUser, 200);
        expect(enableResponse.success).to.eql(true, "authorized user can't enable EEM");

        let definitionsResponse = await getInstalledDefinitions(supertest);
        expect(definitionsResponse.definitions.length).to.eql(builtInDefinitions.length);

        // increment the version of builtin definitions
        const updatedBuiltinDefinitions = definitionsResponse.definitions.map((definition) => {
          return {
            ...definition,
            version: semver.inc(definition.version, 'minor')!,
          };
        });

        const upgradeResponse = await upgradeBuiltinDefinitions(
          supertest,
          updatedBuiltinDefinitions
        );
        expect(upgradeResponse.success).to.eql(true);

        // check builtin definitions are running the latest version
        definitionsResponse = await getInstalledDefinitions(supertest);
        expect(definitionsResponse.definitions.length).to.eql(builtInDefinitions.length);
        expect(
          updatedBuiltinDefinitions.every((builtin) =>
            isInstalledAndRunning(builtin, definitionsResponse.definitions)
          )
        ).to.eql(true, 'all builtin definitions are not installed/running');

        await disableEntityDiscovery(authorizedUser, 200, { deleteData: true });
      });
    });

    it('should install new builtin definitions', async () => {
      await expectNoInstalledDefinitions();

      const enableResponse = await enableEntityDiscovery(authorizedUser, 200);
      expect(enableResponse.success).to.eql(true, "authorized user can't enable EEM");

      // inject definition to simulate release of new builtin definition
      const latestBuiltInDefinitions = [...builtInDefinitions, mockBuiltInEntityDefinition];
      const upgradeResponse = await upgradeBuiltinDefinitions(supertest, latestBuiltInDefinitions);
      expect(upgradeResponse.success).to.eql(true, 'upgrade was not successful');

      const definitionsResponse = await getInstalledDefinitions(supertest);
      expect(definitionsResponse.definitions.length).to.eql(latestBuiltInDefinitions.length);
      expect(
        isInstalledAndRunning(mockBuiltInEntityDefinition, definitionsResponse.definitions)
      ).to.ok();

      await disableEntityDiscovery(authorizedUser, 200, { deleteData: true });
    });
  });
}
