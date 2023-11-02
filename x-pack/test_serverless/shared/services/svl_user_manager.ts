/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';
import * as fs from 'fs';
import { load as loadYaml } from 'js-yaml';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

export interface User {
  readonly username: string;
  readonly password: string;
  readonly apiKey: string;
}

export function SvlUserManagerProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const isServerless = config.get('serverless');
  const isCloud = !!process.env.TEST_CLOUD;
  const cloudRoleUsersFilePath = resolve(REPO_ROOT, '.ftr', 'role_users.json');
  const roles = Object.keys(
    loadYaml(fs.readFileSync('packages/kbn-es/src/serverless_resources/roles.yml', 'utf8'))
  );
  let users: { [key: string]: User };

  if (!isServerless) {
    throw new Error(`'svlUserManager' service can't be used in non-serverless FTR context`);
  }

  if (isCloud) {
    if (!fs.existsSync(cloudRoleUsersFilePath)) {
      throw new Error(
        `svlUserManager service requires user roles to be defined in ${cloudRoleUsersFilePath}`
      );
    }

    const data = fs.readFileSync(cloudRoleUsersFilePath, 'utf8');

    if (data.length === 0) {
      throw new Error(`'${cloudRoleUsersFilePath}' is empty: no roles are defined`);
    }
    users = JSON.parse(data);
  }

  return {
    getCookieByRole(roleName: string) {
      if (roles.includes(roleName)) {
        // use SAML to get the cookie for the specific role
      } else {
        throw new Error(`'${roleName}' role is not defined in serverless resources`);
      }
    },

    // should be private if we decide to unify the process b/w MKI & local
    getByRole(roleName: string) {
      const user = users[roleName];
      if (user) {
        return user;
      } else {
        throw new Error(`'${roleName}' role is not defined in '${cloudRoleUsersFilePath}'`);
      }
    },
  };
}
