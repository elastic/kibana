/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { getNoResponseActionsRole } from './without_response_actions_role';
import { RULES_FEATURE_ID, SECURITY_FEATURE_ID } from '../../../../common/constants';

export const getT1Analyst: () => Omit<Role, 'name'> = () => {
  const noResponseActionsRole = getNoResponseActionsRole();
  return {
    ...noResponseActionsRole,
    kibana: [
      {
        ...noResponseActionsRole.kibana[0],
        feature: {
          ...noResponseActionsRole.kibana[0].feature,
          // TODO: why was this changed to siemV3?
          [SECURITY_FEATURE_ID]: ['all'],
          [RULES_FEATURE_ID]: ['all'],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
        },
      },
    ],
  };
};
