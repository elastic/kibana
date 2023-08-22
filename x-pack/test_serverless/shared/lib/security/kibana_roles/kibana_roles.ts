/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeLoad as loadYaml } from 'js-yaml';
import { readFileSync } from 'fs';
import * as path from 'path';
import { cloneDeep, merge } from 'lodash';
import { FeaturesPrivileges, Role, RoleIndexPrivilege } from '@kbn/security-plugin/common';

const ROLES_YAML_FILE_PATH = path.join(__dirname, 'project_controller_security_roles.yml');

export enum ServerlessRoleName {
  T1_ANALYST = 't1_analyst',
  T2_ANALYST = 't2_analyst',
  T3_ANALYST = 't3_analyst',
  THREAT_INTELLIGENCE_ANALYST = 'threat_intelligence_analyst',
  RULE_AUTHOR = 'rule_author',
  SOC_MANAGER = 'soc_manager',
  DETECTIONS_ADMIN = 'detections_admin',
  PLATFORM_ENGINEER = 'platform_engineer',
  ENDPOINT_OPERATIONS_ANALYST = 'endpoint_operations_analyst',
  ENDPOINT_POLICY_MANAGER = 'endpoint_policy_manager',
  READER = 'reader', // custom role to test lack of permissions
}

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
          feature: definition.applications.reduce((features, application) => {
            if (application.resources !== '*') {
              throw new Error(
                `YAML role definition parser does not currently support 'application.resource = ${application.resources}' for ${application.application} `
              );
            }

            features[application.application] = application.privileges;
            return features;
          }, {} as FeaturesPrivileges),
        },
      ],
    };

    roles[roleName as ServerlessRoleName] = kibanaRole;

    return roles;
  }, {} as ServerlessSecurityRoles);
};
