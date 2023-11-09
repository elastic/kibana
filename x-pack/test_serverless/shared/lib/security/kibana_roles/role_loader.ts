/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { KbnClient } from '@kbn/test';
import { Role } from '@kbn/security-plugin/common';
import { ToolingLog } from '@kbn/tooling-log';
import { inspect } from 'util';
import { AxiosError } from 'axios';
import {
  getServerlessSecurityKibanaRoleDefinitions,
  ServerlessSecurityRoles,
  YamlRoleDefinitions,
} from './kibana_roles';
import { STANDARD_HTTP_HEADERS } from '../default_http_headers';

const ignoreHttp409Error = (error: AxiosError) => {
  if (error?.response?.status === 409) {
    return;
  }

  throw error;
};

export interface LoadedRoleAndUser {
  role: string;
  username: string;
  password: string;
}

export class RoleAndUserLoader<R extends Record<string, Role> = Record<string, Role>> {
  protected readonly logPromiseError: (error: Error) => never;

  constructor(
    protected readonly kbnClient: KbnClient,
    protected readonly logger: ToolingLog,
    protected readonly roles: R
  ) {
    this.logPromiseError = (error) => {
      this.logger.error(inspect(error, { depth: 5 }));
      throw error;
    };
  }

  async load(name: keyof R, additionalRoleName?: string): Promise<LoadedRoleAndUser> {
    const role = this.roles[name];

    if (!role) {
      throw new Error(
        `Unknown role: [${String(name)}]. Valid values are: [${Object.keys(this.roles).join(', ')}]`
      );
    }
    const roleName = role.name;
    const roleNames = [roleName];
    if (additionalRoleName) {
      roleNames.push(additionalRoleName);
    }
    await this.createRole(role);
    await this.createUser(roleName, 'changeme', roleNames);

    return {
      role: roleName,
      username: roleName,
      password: 'changeme',
    };
  }

  private async createRole(role: Role): Promise<void> {
    const { name: roleName, ...roleDefinition } = role;

    this.logger.debug(`creating role:`, roleDefinition);

    await this.kbnClient
      .request({
        method: 'PUT',
        path: `/api/security/role/${roleName}`,
        headers: {
          ...STANDARD_HTTP_HEADERS,
        },
        body: roleDefinition,
      })
      .catch(ignoreHttp409Error)
      .catch(this.logPromiseError)
      .then((response) => {
        this.logger.info(`Role [${roleName}] created/updated`, response?.data);
        return response;
      });
  }

  private async createUser(
    username: string,
    password: string,
    roles: string[] = []
  ): Promise<void> {
    const user = {
      username,
      password,
      roles,
      full_name: username,
      email: '',
    };

    this.logger.debug(`creating user:`, user);

    await this.kbnClient
      .request({
        method: 'POST',
        path: `/internal/security/users/${username}`,
        headers: {
          ...STANDARD_HTTP_HEADERS,
        },
        body: user,
      })
      .catch(ignoreHttp409Error)
      .catch(this.logPromiseError)
      .then((response) => {
        this.logger.info(`User [${username}] created/updated`, response?.data);
        return response;
      });
  }
}

export class SecurityRoleAndUserLoader extends RoleAndUserLoader<ServerlessSecurityRoles> {
  constructor(
    kbnClient: KbnClient,
    logger: ToolingLog,
    additionalRoleDefinitions?: YamlRoleDefinitions
  ) {
    super(kbnClient, logger, getServerlessSecurityKibanaRoleDefinitions(additionalRoleDefinitions));
  }
}
