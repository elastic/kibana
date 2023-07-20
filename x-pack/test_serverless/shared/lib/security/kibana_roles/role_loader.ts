/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { KbnClient } from '@kbn/test';
import { Role } from '@kbn/security-plugin/common';
import {
  getServerlessSecurityKibanaRoleDefinitions,
  ServerlessSecurityRoles,
} from './kibana_roles';

interface LoadedRoleAndUser {
  role: string;
  username: string;
  password: string;
}

export class RoleAndUserLoader<R extends Record<string, Role> = Record<string, Role>> {
  constructor(private readonly kbnClient: KbnClient, private readonly roles: R) {}

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

    await this.kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${name}?createOnly=true`,
      body: roleDefinition,
    });
  }

  private async createUser(
    username: string,
    password: string,
    roles: string[] = []
  ): Promise<void> {
    await this.kbnClient.request({
      method: 'POST',
      path: `/internal/security/users/${username}`,
      body: {
        username,
        password,
        roles,
        full_name: username,
        email: '',
      },
    });
  }
}

export class SecurityRoleAndUserLoader extends RoleAndUserLoader<ServerlessSecurityRoles> {
  constructor(kbnClient: KbnClient) {
    super(kbnClient, getServerlessSecurityKibanaRoleDefinitions());
  }
}
