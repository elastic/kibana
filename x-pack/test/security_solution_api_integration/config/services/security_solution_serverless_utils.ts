/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import { format as formatUrl } from 'url';
import { RoleCredentials } from '../../../../test_serverless/shared/services';
import { FtrProviderContext } from '../../ftr_provider_context';
import { SecuritySolutionUtils } from './types';

export function SecuritySolutionServerlessUtils({
  getService,
}: FtrProviderContext): SecuritySolutionUtils {
  const svlUserManager = getService('svlUserManager');
  const lifecycle = getService('lifecycle');
  const svlCommonApi = getService('svlCommonApi');
  const config = getService('config');
  const log = getService('log');

  const rolesCredentials = new Map<string, RoleCredentials>();
  const commonRequestHeader = svlCommonApi.getCommonRequestHeader();
  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });
  const agentWithCommonHeaders = supertest.agent(kbnUrl).set(commonRequestHeader);

  async function invalidateApiKey(credentials: RoleCredentials) {
    await svlUserManager.invalidateApiKeyForRole(credentials);
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

  return {
    getUsername: async (role = 'admin') => {
      const { username } = await svlUserManager.getUserData(role);

      return username;
    },
    /**
     * Only one API key for each role can be active at a time.
     */
    createSuperTest: async (role = 'admin') => {
      cleanCredentials(role);
      const credentials = await svlUserManager.createApiKeyForRole(role);
      rolesCredentials.set(role, credentials);

      return agentWithCommonHeaders.set(credentials.apiKeyHeader);
    },
  };
}
