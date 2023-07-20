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
import {
  getServerlessSecurityKibanaRoleDefinitions,
  ServerlessSecurityRoles,
} from './kibana_roles';

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

  async load(name: keyof R): Promise<LoadedRoleAndUser> {
    const role = this.roles[name];
    const roleName = role.name;

    await this.createRole(role);
    await this.createUser(roleName, 'changeme', [roleName]);

    return {
      role: roleName,
      username: roleName,
      password: 'changeme',
    };
  }

  private async createRole(role: Role): Promise<void> {
    const { name: roleName, ...roleDefinition } = role;

    await this.kbnClient
      .request({
        method: 'PUT',
        path: `/api/security/role/${roleName}?createOnly=true`,
        body: roleDefinition,
      })
      .catch(this.logPromiseError);
  }

  private async createUser(
    username: string,
    password: string,
    roles: string[] = []
  ): Promise<void> {
    await this.kbnClient
      .request({
        method: 'POST',
        path: `/internal/security/users/${username}`,
        body: {
          username,
          password,
          roles,
          full_name: username,
          email: '',
        },
      })
      .catch(this.logPromiseError);
  }
}

export class SecurityRoleAndUserLoader extends RoleAndUserLoader<ServerlessSecurityRoles> {
  constructor(kbnClient: KbnClient, logger: ToolingLog) {
    super(kbnClient, logger, getServerlessSecurityKibanaRoleDefinitions());
  }
}
