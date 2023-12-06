/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';

import axios from 'axios';

import * as fs from 'fs';

import { SecurityRoleName } from '@kbn/security-solution-plugin/common/test';
import { User } from '../../../../test_serverless/shared/services/user_manager/svl_user_manager';
import {
  createCloudSAMLSession,
  CloudSamlSessionParams,
  LocalSamlSessionParams,
  createLocalSAMLSession,
} from '../../../../test_serverless/shared/services/user_manager/saml_auth';

export const samlAuthentication = async (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<void> => {
  const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

  const kbnHost = config.env.KIBANA_URL || config.env.BASE_URL;

  const auth = btoa(`${config.env.ELASTICSEARCH_USERNAME}:${config.env.ELASTICSEARCH_PASSWORD}`);

  const response = await axios.get(`${kbnHost}/api/status`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const kbnVersion = response.data.version.number;

  const cloudRoleUsersFilePath = resolve(REPO_ROOT, '.ftr', 'role_users.json');

  const roleToUserMap: Map<string, User> = new Map<string, User>();

  const getCloudUserByRole = (role: string) => {
    const data = fs.readFileSync(cloudRoleUsersFilePath, 'utf8');
    if (data.length === 0) {
      throw new Error(`'${cloudRoleUsersFilePath}' is empty: no roles are defined`);
    }
    for (const [roleName, user] of Object.entries(JSON.parse(data)) as Array<[string, User]>) {
      roleToUserMap.set(roleName, user);
    }
    return roleToUserMap.get(role)!;
  };

  on('task', {
    createCloudSAMLSession: async (role: string | SecurityRoleName): Promise<string> => {
      const samlSessionParams: CloudSamlSessionParams = {
        ...getCloudUserByRole(role),
        kbnHost,
        kbnVersion,
        log,
      };
      const session = await createCloudSAMLSession(samlSessionParams);
      return session.getCookieValue();
    },
    createLocalSAMLSession: async (role: string | SecurityRoleName): Promise<string> => {
      const localSamlSessionParams: LocalSamlSessionParams = {
        username: role,
        email: `${role}@elastic.co`,
        fullname: role,
        role,
        kbnHost,
        log,
      };
      const session = await createLocalSAMLSession(localSamlSessionParams);
      return session.getCookieValue();
    },
  });
};
