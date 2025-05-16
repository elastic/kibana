/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load as loadYaml } from 'js-yaml';
import { readFileSync } from 'fs';
import * as path from 'path';
import { cloneDeep, merge } from 'lodash';
import { FeaturesPrivileges, Role, RoleIndexPrivilege } from '@kbn/security-plugin/common';
import { ServerlessRoleName } from '../types';

const ROLES_YAML_FILE_PATH = path.join(__dirname, 'project_controller_security_roles.yml');

const ROLE_NAMES = Object.values(ServerlessRoleName);

interface IApplication {
  application: string;
  privileges: string[];
  resources: string;
}
export type YamlRoleDefinitions = Record<
  ServerlessRoleName,
  {
    cluster: string[] | null;
    indices: RoleIndexPrivilege[];
    applications: IApplication[];
  }
>;

const roleDefinitions = loadYaml(readFileSync(ROLES_YAML_FILE_PATH, 'utf8')) as YamlRoleDefinitions;

export type ServerlessSecurityRoles = Record<ServerlessRoleName, Role>;

export const getServerlessSecurityKibanaRoleDefinitions = (
  additionalRoleDefinitions?: YamlRoleDefinitions
): ServerlessSecurityRoles => {
  const definitions = cloneDeep(roleDefinitions);
  const mergedDefinitions: YamlRoleDefinitions = merge(
    definitions,
    additionalRoleDefinitions || {}
  );

  return Object.entries(mergedDefinitions).reduce((roles, [roleName, definition]) => {
    if (!ROLE_NAMES.includes(roleName as ServerlessRoleName)) {
      throw new Error(
        `Un-expected role [${roleName}] found in YAML file [${ROLES_YAML_FILE_PATH}]`
      );
    }
    const mapApplicationToKibanaFeaturePrivileges = (
      application: IApplication
    ): FeaturesPrivileges => {
      if (application.resources !== '*') {
        throw new Error(
          `YAML role definition parser does not currently support 'application.resource = ${application.resources}' for ${application.application} `
        );
      }

      const features: FeaturesPrivileges = {};

      application.privileges.forEach((value) => {
        const [feature, permission] = value.split('.');
        const featureKey = feature.split('_')[1];

        if (!features[featureKey]) {
          features[featureKey] = [];
        }

        if (permission) {
          features[featureKey].push(permission);
        }
      });

      return features;
    };

    const feature = mapApplicationToKibanaFeaturePrivileges(definition.applications[0]);

    const kibanaRole: Role = {
      name: roleName,
      elasticsearch: {
        cluster: definition.cluster ?? [],
        indices: definition.indices ?? [],
        run_as: [],
      },
      kibana: [
        {
          base: [],
          spaces: ['*'],
          feature,
        },
      ],
    };

    roles[roleName as ServerlessRoleName] = kibanaRole;

    return roles;
  }, {} as ServerlessSecurityRoles);
};
