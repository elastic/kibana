/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessProjectType, SERVERLESS_ROLES_ROOT_PATH } from '@kbn/es';
import { SamlSessionManager } from '@kbn/test';
import { readRolesFromResource } from '@kbn/es';
import { resolve } from 'path';
import { Role } from '@kbn/test/src/auth/types';
import { isServerlessProjectType } from '@kbn/es/src/utils';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

export interface RoleCredentials {
  apiKey: { id: string; name: string };
  apiKeyHeader: { Authorization: string };
  cookieHeader: { Cookie: string };
}

export function SvlUserManagerProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const log = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const isCloud = !!process.env.TEST_CLOUD;
  const kbnServerArgs = config.get('kbnTestServer.serverArgs') as string[];
  const projectType = kbnServerArgs
    .filter((arg) => arg.startsWith('--serverless'))
    .reduce((acc, arg) => {
      const match = arg.match(/--serverless[=\s](\w+)/);
      return acc + (match ? match[1] : '');
    }, '') as ServerlessProjectType;

  if (!isServerlessProjectType(projectType)) {
    throw new Error(`Unsupported serverless projectType: ${projectType}`);
  }

  const supportedRoles = readRolesFromResource(
    resolve(SERVERLESS_ROLES_ROOT_PATH, projectType, 'roles.yml')
  );
  const defaultRolesToMap = new Map<string, Role>([
    ['es', 'developer'],
    ['security', 'editor'],
    ['oblt', 'editor'],
  ]);

  const getDefaultRole = () => {
    if (defaultRolesToMap.has(projectType)) {
      return defaultRolesToMap.get(projectType)!;
    } else {
      throw new Error(`Default role is not defined for ${projectType} project`);
    }
  };

  // Sharing the instance within FTR config run means cookies are persistent for each role between tests.
  const sessionManager = new SamlSessionManager({
    hostOptions: {
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: isCloud ? undefined : config.get('servers.kibana.port'),
      username: config.get('servers.kibana.username'),
      password: config.get('servers.kibana.password'),
    },
    log,
    isCloud,
    supportedRoles,
  });

  const DEFAULT_ROLE = getDefaultRole();

  return {
    async getSessionCookieForRole(role: string) {
      return sessionManager.getSessionCookieForRole(role);
    },
    async getApiCredentialsForRole(role: string) {
      return sessionManager.getApiCredentialsForRole(role);
    },
    async getEmail(role: string) {
      return sessionManager.getEmail(role);
    },

    async getUserData(role: string) {
      return sessionManager.getUserData(role);
    },
    async createApiKeyForDefaultRole() {
      log.debug(`Creating api key for default role: [${this.DEFAULT_ROLE}]`);
      return this.createApiKeyForRole(this.DEFAULT_ROLE);
    },
    async createApiKeyForRole(role: string): Promise<RoleCredentials> {
      const cookieHeader = await this.getApiCredentialsForRole(role);

      const { body, status } = await supertestWithoutAuth
        .post('/internal/security/api_key')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(cookieHeader)
        .send({
          name: 'myTestApiKey',
          metadata: {},
          role_descriptors: {},
        });
      expect(status).to.be(200);

      const apiKey = body;
      const apiKeyHeader = { Authorization: 'ApiKey ' + apiKey.encoded };

      log.debug(`Created api key for role: [${role}]`);
      return { apiKey, apiKeyHeader, cookieHeader };
    },
    async invalidateApiKeyForRole(roleCredentials: RoleCredentials) {
      const requestBody = {
        apiKeys: [
          {
            id: roleCredentials.apiKey.id,
            name: roleCredentials.apiKey.name,
          },
        ],
        isAdmin: true,
      };

      const { status } = await supertestWithoutAuth
        .post('/internal/security/api_key/invalidate')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleCredentials.cookieHeader)
        .send(requestBody);

      expect(status).to.be(200);
    },
    DEFAULT_ROLE,
  };
}
