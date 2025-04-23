/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin-types-common';

import { ToolingLog } from '@kbn/tooling-log';

import { SecurityRoleName } from '@kbn/security-solution-plugin/common/test';
import { HostOptions, SamlSessionManager } from '@kbn/test';
import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';
import axios from 'axios';
import fs from 'fs';
import yaml from 'js-yaml';
import { DEFAULT_SERVERLESS_ROLE } from '../env_var_names_constants';

export const samlAuthentication = async (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<void> => {
  const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

  const kbnHost = config.env.KIBANA_URL || config.env.BASE_URL;

  const kbnUrl = new URL(kbnHost);

  const hostOptions: HostOptions = {
    protocol: kbnUrl.protocol as 'http' | 'https',
    hostname: kbnUrl.hostname,
    port: parseInt(kbnUrl.port, 10),
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
  };

  const rolesPath =
    '../../../../src/platform/packages/shared/kbn-es/src/serverless_resources/project_roles/security/roles.yml';

  // If config.env.PROXY_ORG is set, it means that proxy service is used to create projects. Define the proxy org filename to override the roles.
  const rolesFilename = config.env.PROXY_ORG ? `${config.env.PROXY_ORG}.json` : undefined;
  const cloudUsersFilePath = resolve(REPO_ROOT, '.ftr', rolesFilename ?? 'role_users.json');

  const INTERNAL_REQUEST_HEADERS = {
    'kbn-xsrf': 'cypress-creds',
    'x-elastic-internal-origin': 'security-solution',
  };

  const getYamlData = (filePath: string): any => {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents);
  };

  const getRoleConfiguration = (role: string, filePath: string): any => {
    const data = getYamlData(filePath);
    if (data[role]) {
      return data[role];
    } else {
      throw new Error(`Role '${role}' not found in the YAML file.`);
    }
  };

  const sessionManager = new SamlSessionManager({
    hostOptions,
    log,
    isCloud: config.env.CLOUD_SERVERLESS,
    cloudUsersFilePath,
  });

  const adminCookieHeader = await sessionManager.getApiCredentialsForRole('admin');

  on('task', {
    getSessionCookie: async (role: string | SecurityRoleName): Promise<string> => {
      return sessionManager.getInteractiveUserSessionCookieWithRoleScope(role);
    },
    getApiKeyForRole: async (role: string | SecurityRoleName): Promise<string> => {
      let roleDescriptor = {};

      const roleConfig = getRoleConfiguration(role, rolesPath);

      roleDescriptor = { [role]: roleConfig };

      const response = await axios.post(
        `${kbnHost}/internal/security/api_key`,
        {
          name: 'myTestApiKey',
          metadata: {},
          role_descriptors: roleDescriptor,
        },
        {
          headers: {
            ...INTERNAL_REQUEST_HEADERS,
            ...adminCookieHeader,
          },
        }
      );

      const apiKey = response.data.encoded;
      return apiKey;
    },
    createServerlessCustomRole: async ({
      roleDescriptor,
      roleName,
    }: {
      roleDescriptor: { kibana: Role['kibana']; elasticsearch: Role['elasticsearch'] };
      roleName: string;
    }): Promise<{ status: number; data: Role }> => {
      const customRoleDescriptors = {
        kibana: roleDescriptor.kibana,
        elasticsearch: roleDescriptor.elasticsearch ?? [],
      };

      const response = await axios.put(
        `${kbnHost}/api/security/role/${roleName}`,
        customRoleDescriptors,
        {
          headers: {
            ...INTERNAL_REQUEST_HEADERS,
            ...adminCookieHeader,
          },
        }
      );
      return {
        status: response.status,
        data: response.data,
      };
    },
    deleteServerlessCustomRole: async (
      roleName: string
    ): Promise<{ status: number; data: unknown }> => {
      const response = await axios.delete(`${kbnHost}/api/security/role/${roleName}`, {
        headers: {
          ...INTERNAL_REQUEST_HEADERS,
          ...adminCookieHeader,
        },
      });

      return {
        status: response.status,
        data: response.data,
      };
    },
    getFullname: async (
      role: string | SecurityRoleName = DEFAULT_SERVERLESS_ROLE
    ): Promise<string> => {
      const { full_name: fullName } = await sessionManager.getUserData(role);
      return fullName;
    },
    getUsername: async (
      role: string | SecurityRoleName = DEFAULT_SERVERLESS_ROLE
    ): Promise<string> => {
      const { username } = await sessionManager.getUserData(role);
      return username;
    },
  });
};
