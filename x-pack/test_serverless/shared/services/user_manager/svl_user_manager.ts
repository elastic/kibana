/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';
import * as fs from 'fs';
import Url from 'url';
import { createNewSAMLSession } from './saml_auth';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export interface User {
  readonly username: string;
  readonly password: string;
}

export type Role = string;
export interface Session {
  cookie: string;
  username: string;
}

export function SvlUserManagerProvider({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const config = getService('config');
  const log = getService('log');
  const isServerless = config.get('serverless');
  const isCloud = !!process.env.TEST_CLOUD;
  // const cloudEnv = process.env.TEST_CLOUD_ENV ?? 'qa';
  const cloudRoleUsersFilePath = resolve(REPO_ROOT, '.ftr', 'role_users.json');
  // const roles = Object.keys(
  //   loadYaml(fs.readFileSync('packages/kbn-es/src/serverless_resources/roles.yml', 'utf8'))
  // );
  let users: { [key: string]: User };

  if (!isServerless) {
    throw new Error(`'svlUserManager' service can't be used in non-serverless FTR context`);
  }

  if (!isCloud) {
    log.warning(
      `Roles testing is only available on Cloud at the moment.
    We are working to enable it for the local development`
    );
  } else {
    // QAF should prepare the file on MKI pipelines
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

  // to be re-used within FTr config run
  const sessionCache = new Map<Role, Session>();

  return {
    getApiKeyByRole() {
      // Get API key from cookie for API integration tests
    },

    async getSessionByRole(role: string) {
      if (sessionCache.has(role)) {
        return sessionCache.get(role)!;
      }

      log.debug(`new SAML authentication with ${role} role`);
      const { username, password } = this.getUserByRole(role);
      const kbnVersion = await kibanaServer.version.get();
      const kbnHost = Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
      });

      const session = await createNewSAMLSession({
        username,
        password,
        cloudEnv: 'qa',
        kbnHost,
        kbnVersion,
      });

      sessionCache.set(role, session);
      return session;
    },

    getUserByRole(role: string) {
      // WIP
      if (!isCloud) {
        throw new Error('Roles are not defined for local run');
      }
      const user = users[role];
      if (user) {
        return user;
      } else {
        throw new Error(`'${role}' role is not defined in '${cloudRoleUsersFilePath}'`);
      }
    },
  };
}
