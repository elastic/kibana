/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeLoad as loadYaml } from 'js-yaml';
import { readFileSync } from 'fs';
import * as path from 'path';
import { cloneDeep } from 'lodash';
import { FeaturesPrivileges, Role, RoleIndexPrivilege } from '@kbn/security-plugin/common';
import { ServerlessRoleName } from '../types';

const ROLES_YAML_FILE_PATH = path.join(
  __dirname,
  '../../../../../../packages/kbn-es/src/serverless_resources/roles.yml'
);

const ROLE_NAMES = Object.values(ServerlessRoleName);

export type YamlRoleDefinitions = Record<
  ServerlessRoleName,
  {
    cluster: string[] | null;
    indices: RoleIndexPrivilege[];
    applications: Array<{
      application: string;
      privileges: string[];
      resources: string;
    }>;
  }
>;

const roleDefinitions = loadYaml(readFileSync(ROLES_YAML_FILE_PATH, 'utf8')) as YamlRoleDefinitions;

export type ServerlessSecurityRoles = Record<ServerlessRoleName, Role>;

export const getServerlessSecurityKibanaRoleDefinitions = (): ServerlessSecurityRoles => {
  const definitions = cloneDeep(roleDefinitions);

  return Object.entries(definitions).reduce((roles, [roleName, definition]) => {
    if (!ROLE_NAMES.includes(roleName as ServerlessRoleName)) {
      throw new Error(
        `Un-expected role [${roleName}] found in YAML file [${ROLES_YAML_FILE_PATH}]`
      );
    }
    const mapKibanaFeatureToEsPrivileges = (kibanaFeatures: string[]): FeaturesPrivileges => {
      const features = {};

      kibanaFeatures.forEach((value) => {
        const [feature, permission] = value.split('.');
        const featureKey = feature.split('_')[1];

        if (value === 'read' || value === 'all' || value === '*') {
          features[value] = [value];
        }
        if (!features[featureKey]) {
          features[featureKey] = [];
        }

        if (permission) {
          features[featureKey].push(permission);
        }
      });

      return features;
    };

    const feature = mapKibanaFeatureToEsPrivileges(definition.applications[0].privileges);

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
