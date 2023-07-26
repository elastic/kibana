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

const ROLES_YAML_FILE_PATH = path.join(__dirname, 'project_controller_security_roles.yml');

const ROLE_NAMES = [
  't1_analyst',
  't2_analyst',
  't3_analyst',
  'threat_intelligence_analyst',
  'rule_author',
  'soc_manager',
  'detections_admin',
  'platform_engineer',
  'endpoint_operations_analyst',
  'endpoint_policy_manager',
] as const;

export type ServerlessRoleName = typeof ROLE_NAMES[number];

type YamlRoleDefinitions = Record<
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
