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
import type { SendOptions as SecureBsearchSendOptions } from '@kbn/test-suites-serverless/shared/services/bsearch_secure';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { SecuritySolutionUtilsInterface } from './types';

export function SecuritySolutionServerlessUtils({
  getService,
}: FtrProviderContext): SecuritySolutionUtilsInterface {
  const svlUserManager = getService('svlUserManager');
  const lifecycle = getService('lifecycle');
  const svlCommonApi = getService('svlCommonApi');
  const config = getService('config');
  const log = getService('log');
  const SecureBsearch = getService('secureBsearch');

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

    createBsearch: async (role = 'admin') => {
      const apiKeyHeader = rolesCredentials.get(role)?.apiKeyHeader;

      if (!apiKeyHeader) {
        log.error(`API key for role [${role}] is not available, SecureBsearch cannot be created`);
      }

      const send = <T extends IEsSearchResponse>(sendOptions: SendOptions): Promise<T> => {
        const { supertest: _, ...rest } = sendOptions;
        const serverlessSendOptions: SecureBsearchSendOptions = {
          ...rest,
          // We need super test WITHOUT auth to make the request here, as we are setting the auth header in bsearch `apiKeyHeader`
          supertestWithoutAuth: supertest.agent(kbnUrl),
          apiKeyHeader: apiKeyHeader ?? { Authorization: '' },
          internalOrigin: 'Kibana',
        };

        log.debug(
          `Sending request to SecureBsearch with options: ${JSON.stringify(serverlessSendOptions)}`
        );
        return SecureBsearch.send(serverlessSendOptions);
      };

      return { ...SecureBsearch, send };
    },
  };
}
