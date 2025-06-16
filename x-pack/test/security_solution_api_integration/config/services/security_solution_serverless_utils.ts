/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import { format as formatUrl } from 'url';
import { IEsSearchResponse } from '@kbn/search-types';
import { RoleCredentials } from '@kbn/test-suites-serverless/shared/services';
import type { SendOptions } from '@kbn/ftr-common-functional-services';
import type { SendOptions as SecureSearchSendOptions } from '@kbn/test-suites-serverless/shared/services/search_secure';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { SecuritySolutionUtilsInterface, User } from './types';
import { roles } from '../privileges/roles';

export function SecuritySolutionServerlessUtils({
  getService,
}: FtrProviderContext): SecuritySolutionUtilsInterface {
  const svlUserManager = getService('svlUserManager');
  const lifecycle = getService('lifecycle');
  const svlCommonApi = getService('svlCommonApi');
  const config = getService('config');
  const log = getService('log');
  const SecureSearch = getService('secureSearch');

  const rolesCredentials = new Map<string, RoleCredentials>();
  const commonRequestHeader = svlCommonApi.getCommonRequestHeader();
  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });

  async function invalidateApiKey(credentials: RoleCredentials) {
    await svlUserManager.invalidateM2mApiKeyWithRoleScope(credentials);
  }

  async function cleanCredentials(role: string) {
    if (rolesCredentials.has(role)) {
      log.debug(`Invalidating API key for role [${role}]`);
      await invalidateApiKey(rolesCredentials.get(role)!);
      rolesCredentials.delete(role);
    }
  }

  // Invalidate API keys when all tests have finished.
  lifecycle.cleanup.add(async () => {
    rolesCredentials.forEach((credential, role) => {
      log.debug(`Invalidating API key for role [${role}]`);
      invalidateApiKey(credential);
    });
  });

  const createSuperTest = async (role = 'admin') => {
    cleanCredentials(role);
    const credentials = await svlUserManager.createM2mApiKeyWithRoleScope(role);
    rolesCredentials.set(role, credentials);

    const agentWithCommonHeaders = supertest.agent(kbnUrl).set(commonRequestHeader);
    return agentWithCommonHeaders.set(credentials.apiKeyHeader);
  };

  return {
    getUsername: async (role = 'admin') => {
      const { username } = await svlUserManager.getUserData(role);

      return username;
    },
    /**
     * Only one API key for each role can be active at a time.
     */
    createSuperTest,

    createSuperTestWithUser: async (user: User) => {
      if (user.roles.length > 1) {
        throw new Error(
          `This test service only supports authentication for users with a single role. Error for ${
            user.username
          } with roles ${user.roles.join(',')}.`
        );
      }
      const userRoleName = user.roles[0];
      const roleDefinition = roles.find((role) => role.name === userRoleName);
      if (!roleDefinition) {
        throw new Error(`Could not find a role definition for ${userRoleName}`);
      }
      await svlUserManager.setCustomRole(roleDefinition.privileges);
      const roleAuthc = await svlUserManager.createM2mApiKeyWithCustomRoleScope();
      const superTest = supertest
        .agent(kbnUrl)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader);
      return superTest;
    },

    cleanUpCustomRole: async () => {
      await svlUserManager.deleteCustomRole();
    },

    createSearch: async (role = 'admin') => {
      const apiKeyHeader = rolesCredentials.get(role)?.apiKeyHeader;

      if (!apiKeyHeader) {
        log.error(`API key for role [${role}] is not available, SecureSearch cannot be created`);
      }

      const send = <T extends IEsSearchResponse>(sendOptions: SendOptions): Promise<T> => {
        const { supertest: _, ...rest } = sendOptions;
        const serverlessSendOptions: SecureSearchSendOptions = {
          ...rest,
          // We need super test WITHOUT auth to make the request here, as we are setting the auth header in bsearch `apiKeyHeader`
          supertestWithoutAuth: supertest.agent(kbnUrl),
          apiKeyHeader: apiKeyHeader ?? { Authorization: '' },
          internalOrigin: 'Kibana',
        };

        log.debug(
          `Sending request to SecureSearch with options: ${JSON.stringify(serverlessSendOptions)}`
        );
        return SecureSearch.send(serverlessSendOptions);
      };

      return { ...SecureSearch, send };
    },
  };
}
