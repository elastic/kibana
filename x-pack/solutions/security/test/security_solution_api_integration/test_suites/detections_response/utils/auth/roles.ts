/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULES_FEATURE_ID_V2,
  RULES_FEATURE_ID_V3,
} from '@kbn/security-solution-features/constants';
import type { CustomRole } from '../../../../config/services/types';

/** Role with Rules V2 ALL and preview indices access. Should be able to create rules and preview them. **/
export const rulesAllPreviewIndexRole: CustomRole = {
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
          [RULES_FEATURE_ID_V2]: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

/** Role with only Rules V3 ALL (no Alerts or other SIEM features). */
export const rulesAllV3OnlyRole: CustomRole = {
  name: 'rules_all_v3_only',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          [RULES_FEATURE_ID_V3]: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
