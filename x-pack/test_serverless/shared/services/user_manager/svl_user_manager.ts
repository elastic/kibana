/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import * as fs from 'fs';
import { load as loadYaml } from 'js-yaml';
import { resolve } from 'path';
import { Cookie } from 'tough-cookie';
import Url from 'url';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';
import { createCloudSAMLSession, createLocalSAMLSession } from './saml_auth';

export interface User {
  readonly email: string;
  readonly password: string;
}

export type Role = string;

export class Session {
  readonly cookie;
  readonly email;
  readonly fullname;
  constructor(cookie: Cookie, email: string, fullname: string) {
    this.cookie = cookie;
    this.email = email;
    this.fullname = fullname;
  }

  getCookieValue() {
    return this.cookie.value;
  }
}

export function SvlUserManagerProvider({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const config = getService('config');
  const log = getService('log');
  const isServerless = config.get('serverless');
  const isCloud = !!process.env.TEST_CLOUD;
  const cloudRoleUsersFilePath = resolve(REPO_ROOT, '.ftr', 'role_users.json');
  const rolesDefinitionFilePath = resolve(
    REPO_ROOT,
    'packages/kbn-es/src/serverless_resources/roles.yml'
  );
  const roles: string[] = Object.keys(loadYaml(fs.readFileSync(rolesDefinitionFilePath, 'utf8')));
  const roleToUserMap: Map<string, User> = new Map<string, User>();

  if (!isServerless) {
    throw new Error(`'svlUserManager' service can't be used in non-serverless FTR context`);
  }

  if (isCloud) {
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
    for (const [roleName, user] of Object.entries(JSON.parse(data)) as Array<[string, User]>) {
      roleToUserMap.set(roleName, user);
    }
  }
  // to be re-used within FTR config run
  const sessionCache = new Map<Role, Session>();

  const getCloudUserByRole = (role: string) => {
    if (!roles.includes(role)) {
      log.warning(`Role '${role}' is not listed in 'kbn-es/src/serverless_resources/roles.yml'`);
    }
    if (roleToUserMap.has(role)) {
      return roleToUserMap.get(role)!;
    } else {
      throw new Error(`User with '${role}' role is not defined`);
    }
  };

  const getSessionByRole = async (role: string) => {
    if (sessionCache.has(role)) {
      return sessionCache.get(role)!;
    }

    const kbnHost = Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: isCloud ? undefined : config.get('servers.kibana.port'),
    });
    let session: Session;

    if (isCloud) {
      log.debug(`new SAML authentication with '${role}' role`);
      const kbnVersion = await kibanaServer.version.get();
      session = await createCloudSAMLSession({
        ...getCloudUserByRole(role),
        kbnHost,
        kbnVersion,
        log,
      });
    } else {
      log.debug(`new fake SAML authentication with '${role}' role`);
      session = await createLocalSAMLSession({
        username: `elastic_${role}`,
        email: `elastic_${role}@elastic.co`,
        fullname: `test ${role}`,
        role,
        kbnHost,
        log,
      });
    }

    sessionCache.set(role, session);
    return session;
  };

  return {
    /*
     * Returns auth header to do API calls with 'supertestWithoutAuth' service
     *
     * @example Create API call as a user with viewer role
     *
     * ```ts
     * const credentials = await svlUserManager.getApiCredentialsForRole('viewer');
     * const response = await supertestWithoutAuth
     *   .get('/api/status')
     *   .set(credentials)
     *   .set('kbn-xsrf', 'kibana');
     * ```
     */
    async getApiCredentialsForRole(role: string) {
      const session = await getSessionByRole(role);
      return { Cookie: `sid=${session.getCookieValue()}` };
    },

    /**
     * Returns sid cookie that can be added to browser context for authentication
     *
     * @example Set cookie in browser context to login with specific role
     *
     * ```ts
     * const sidCookie = await svlUserManager.getSessionCookieForRole(role);
     * Loading bootstrap.js in order to be on the domain that the cookie will be set for.
     * await browser.get(deployment.getHostPort() + '/bootstrap.js');
     * await browser.setCookie('sid', sidCookie);
     * ```
     */
    async getSessionCookieForRole(role: string) {
      const session = await getSessionByRole(role);
      return session.getCookieValue();
    },

    /**
     * Returns SAML user email and full name
     */
    async getUserData(role: string) {
      const { email, fullname } = await getSessionByRole(role);
      return { email, fullname };
    },
  };
}
