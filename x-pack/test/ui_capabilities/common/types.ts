/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
interface FeaturesPrivileges {
  [featureId: string]: string[];
}

// TODO: Consolidate the following type definitions
interface CustomRoleSpecificationElasticsearchIndices {
  names: string[];
  privileges: string[];
}

export interface RoleKibanaPrivilege {
  spaces: string[];
  base?: string[];
  feature?: FeaturesPrivileges;
}

export interface CustomRoleSpecification {
  name: string;
  elasticsearch?: {
    cluster: string[];
    indices: CustomRoleSpecificationElasticsearchIndices[];
  };
  kibana?: RoleKibanaPrivilege[];
}

interface ReservedRoleSpecification {
  name: string;
}

export function isCustomRoleSpecification(
  roleSpecification: CustomRoleSpecification | ReservedRoleSpecification
): roleSpecification is CustomRoleSpecification {
  const customRoleDefinition = roleSpecification as CustomRoleSpecification;
  return (
    customRoleDefinition.kibana !== undefined || customRoleDefinition.elasticsearch !== undefined
  );
}

export interface User {
  username: string;
  fullName: string;
  password: string;
  role?: ReservedRoleSpecification | CustomRoleSpecification;
  roles?: Array<ReservedRoleSpecification | CustomRoleSpecification>;
}

export interface Space {
  id: string;
  name: string;
  disabledFeatures: string[] | '*';
}
