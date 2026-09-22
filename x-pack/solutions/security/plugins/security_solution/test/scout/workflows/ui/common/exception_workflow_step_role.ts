/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { FULL_KIBANA_SECURITY_ROLE } from '@kbn/scout-security';
import {
  RULES_FEATURE_LATEST,
  EXCEPTIONS_SUBFEATURE_ALL_ID,
  SECURITY_FEATURE_ID_V5,
} from '@kbn/security-solution-features/constants';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from '@kbn/workflows';

/**
 * Least-privileged role for the exception-creation workflow-step UI tests
 */
export const EXCEPTION_WORKFLOW_STEP_ROLE: KibanaRole = {
  elasticsearch: FULL_KIBANA_SECURITY_ROLE.elasticsearch,
  kibana: [
    {
      base: [],
      feature: {
        [RULES_FEATURE_LATEST]: ['all', EXCEPTIONS_SUBFEATURE_ALL_ID],
        [SECURITY_FEATURE_ID_V5]: ['read', 'trusted_applications_all'],
        [WORKFLOWS_MANAGEMENT_FEATURE_ID]: [
          'workflow_create',
          'workflow_update',
          'workflow_execute',
          'workflow_read',
          'workflow_execution_read',
        ],
      },
      spaces: ['*'],
    },
  ],
};
