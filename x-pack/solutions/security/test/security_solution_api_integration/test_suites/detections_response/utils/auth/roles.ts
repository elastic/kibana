/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_FEATURE_ID } from '@kbn/security-solution-features/constants';
import type { Role } from '../../../../config/services/types';

/** Role with Rules V1 ALL and preview indices access. Should be able to create rules and preview them. **/
export const rulesAllPreviewIndexRole: Role = {
  name: 'rules_all_preview_index',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: [
            '.preview.alerts-security.alerts-*',
            '.internal.preview.alerts-security.alerts-*',
          ],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [RULES_FEATURE_ID]: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
