/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Consolidate the following type definitions
interface CustomRoleSpecification {
  name: string;
  kibana: {
    global: {
      minimum?: string[];
      feature?: {
        [featureName: string]: string[];
      };
    };
    space?: {
      [spaceId: string]: {
        minimum?: string[];
        feature?: {
          [featureName: string]: string[];
        };
      };
    };
  };
}

interface ReservedRoleSpecification {
  name: string;
}

export function isCustomRoleSpecification(
  roleSpecification: CustomRoleSpecification | ReservedRoleSpecification
): roleSpecification is CustomRoleSpecification {
  return (roleSpecification as CustomRoleSpecification).kibana !== undefined;
}

export interface User {
  username: string;
  fullName: string;
  password: string;
  role: ReservedRoleSpecification | CustomRoleSpecification;
}

export interface Space {
  id: string;
  name: string;
  disabledFeatures: string[];
}
