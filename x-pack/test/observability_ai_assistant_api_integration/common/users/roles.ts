/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AI_ASSISTANT_ROLE_NAME = 'ai_assistant_role';

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

const kibanaPrivileges = [
  {
    feature: {
      observabilityAIAssistant: ['all'],
      actions: ['read'],
    },
    spaces: ['*'],
  },
];

export const aiAssistantRole: Role = {
  name: AI_ASSISTANT_ROLE_NAME,
  privileges: {
    kibana: kibanaPrivileges,
  },
};

export const allRoles = [aiAssistantRole];
