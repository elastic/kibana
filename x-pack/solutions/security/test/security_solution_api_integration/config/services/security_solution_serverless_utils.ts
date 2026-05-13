/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import { format as formatUrl } from 'url';
import type { IEsSearchResponse } from '@kbn/search-types';
import type { RoleCredentials } from '@kbn/test-suites-xpack-platform/serverless/shared/services';
import type { SearchService, SendOptions } from '@kbn/ftr-common-functional-services';
import type { SendOptions as SecureSearchSendOptions } from './search_secure';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { SecuritySolutionUtilsInterface, CustomRole } from './types';

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
    const invalidationPromises = Array.from(rolesCredentials.entries()).map(
      async ([role, credential]) => {
        log.debug(`Invalidating API key for role [${role}]`);
        await invalidateApiKey(credential);
      }
    );
    await Promise.all(invalidationPromises);
  });

  const createSuperTest = async (role = 'admin') => {
    await cleanCredentials(role);
    const credentials = await svlUserManager.createM2mApiKeyWithRoleScope(role);
    rolesCredentials.set(role, credentials);

    const agentWithCommonHeaders = supertest.agent(kbnUrl).set(commonRequestHeader);
    return agentWithCommonHeaders.set(credentials.apiKeyHeader);
  };

  const createSuperTestWithCustomRole = async (roleDefinition: CustomRole) => {
    await svlUserManager.setCustomRole(roleDefinition.privileges);
    const roleAuthc = await svlUserManager.createM2mApiKeyWithCustomRoleScope();
    rolesCredentials.set(roleDefinition.name, roleAuthc);

    const superTest = supertest
      .agent(kbnUrl)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);
    return superTest;
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

    createSuperTestWithCustomRole,

    cleanUpCustomRoles: async () => {
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

      return { ...SecureSearch, send } as SearchService;
    },
  };
}
