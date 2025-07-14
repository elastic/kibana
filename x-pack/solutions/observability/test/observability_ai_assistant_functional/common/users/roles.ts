/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Example role:
// export const allAccessRole: Role = {
//   name: 'all_access',
//   privileges: {
//     elasticsearch: {
//       indices: [
//         {
//           names: ['*'],
//           privileges: ['all'],
//         },
//       ],
//     },
//     kibana: [
//       {
//         feature: {
//           apm: ['all'],
//           actions: ['all'],
//         },
//         spaces: ['*'],
//       },
//     ],
//   },
// };

export interface Role {
  name: string;
  privileges: {
    elasticsearch?: {
      cluster?: string[];
      indices?: Array<{
        names: string[];
        privileges: string[];
      }>;
    };
    kibana?: Array<{
      spaces: string[];
      base?: string[];
      feature?: {
        [featureId: string]: string[];
      };
    }>;
  };
}

export const allRoles = [];
