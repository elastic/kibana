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
import { load as loadYaml } from 'js-yaml';
import { createNewSAMLSession, createSessionWithFakeSAMLAuth } from './saml_auth';
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
  const cloudRoleUsersFilePath = resolve(REPO_ROOT, '.ftr', 'role_users.json');
  const roles: string[] = Object.keys(
    loadYaml(fs.readFileSync('packages/kbn-es/src/serverless_resources/roles.yml', 'utf8'))
  );
  let users: Map<string, User> = new Map<string, User>();

  if (!isServerless) {
    throw new Error(`'svlUserManager' service can't be used in non-serverless FTR context`);
  }

  if (!isCloud) {
    roles.map((role) => {
      users.set(role, { username: `elastic_${role}`, password: 'changeme' });
    });
  } else {
    // QAF should prepare the '.ftr/role_users.json' file for MKI pipelines
    if (!fs.existsSync(cloudRoleUsersFilePath)) {
      throw new Error(
        `svlUserManager service requires user roles to be defined in ${cloudRoleUsersFilePath}`
      );
    }

    const data = fs.readFileSync(cloudRoleUsersFilePath, 'utf8');
    if (data.length === 0) {
      throw new Error(`'${cloudRoleUsersFilePath}' is empty: no roles are defined`);
    }
    users = new Map(Object.entries(JSON.parse(data)));
  }

  // to be re-used within FTR config run
  const sessionCache = new Map<Role, Session>();

  return {
    /*
     * Returns auth header to do API calls with 'supertestWithoutAuth' service
     *
     * @example Create API call with specific user role authentication
     *
     * ```ts
     * const credentials = await svlUserManager.getCredentialsForRole('viewer');
     * const response = await supertestWithoutAuth
     *   .get('/api/status')
     *   .set(credentials)
     *   .set('kbn-xsrf', 'kibana');
     * ```
     */
    async getCredentialsForRole(role: string) {
      const session = await this.getSessionByRole(role);
      return { Cookie: `sid=${session.cookie}` };
    },

    async getSessionByRole(role: string) {
      if (sessionCache.has(role)) {
        return sessionCache.get(role)!;
      }

      const { username, password } = this.getUserByRole(role);
      const kbnHost = Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: isCloud ? undefined : config.get('servers.kibana.port'),
      });
      let session: Session;

      if (isCloud) {
        log.debug(`new SAML authentication with '${role}' role`);
        const kbnVersion = await kibanaServer.version.get();

        session = await createNewSAMLSession({
          username,
          password,
          kbnHost,
          kbnVersion,
        });
      } else {
        log.debug(`new fake SAML authentication with '${role}' role`);
        const email = `${username}@elastic.co`;
        const fullname = `test ${role}`;

        session = await createSessionWithFakeSAMLAuth({
          username,
          email,
          fullname,
          role,
          kbnHost,
        });
      }

      sessionCache.set(role, session);
      return session;
    },

    getUserByRole(role: string) {
      if (!roles.includes(role)) {
        log.warning(`Role '${role}' is not listed in 'kbn-es/src/serverless_resources/roles.yml'`);
      }
      if (users.has(role)) {
        return users.get(role)!;
      } else {
        throw new Error(`User with '${role}' role is not defined`);
      }
    },
  };
}
