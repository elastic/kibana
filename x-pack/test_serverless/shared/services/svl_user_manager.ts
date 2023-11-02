/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';
import * as fs from 'fs';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

export interface User {
  readonly username: string;
  readonly password: string;
  readonly apiKey: string;
}

export function SvlUserManagerProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const isServerless = config.get('serverless');
  const userRolesFilePath = resolve(REPO_ROOT, '.ftr', 'user_roles.json');

  if (!isServerless) {
    throw new Error(`'svlUserManager' service can't be used in non-serverless FTR context`);
  }

  if (!fs.existsSync(userRolesFilePath)) {
    throw new Error(
      `svlUserManager service requires user roles to be defined in ${userRolesFilePath}`
    );
  }

  const data = fs.readFileSync(userRolesFilePath, 'utf8');

  if (data.length === 0) {
    throw new Error(`'${userRolesFilePath}' is empty: no roles are defined`);
  }
  const users: { [key: string]: User } = JSON.parse(data);

  return {
    getByRole(roleName: string) {
      const user = users[roleName];
      if (user) {
        return user;
      } else {
        throw new Error(`'${roleName}' role is not defined in '${userRolesFilePath}'`);
      }
    },
  };
}
