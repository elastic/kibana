/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBLT_DIGITAL_EXPERIENCE_APP_ID } from '@kbn/deeplinks-observability';

export const DIGITAL_EXPERIENCE_FEATURE_ID = OBLT_DIGITAL_EXPERIENCE_APP_ID;

export const DIGITAL_EXPERIENCE_API_PRIVILEGES = {
  read: 'read_digital_experience',
  manage: 'manage_digital_experience',
  /** Set up the sessions transforms; a separate grant, not part of `all`. */
  manageSessions: 'manage_digital_experience_sessions',
} as const;

/** Sub-feature privilege that grants `manageSessions`. */
export const MANAGE_SESSIONS_SUB_FEATURE_PRIVILEGE_ID = 'manage_sessions';

/** APM's API privilege, which the routes also require as the app reads its data through APM. */
export const APM_API_PRIVILEGE = 'apm';

export const DIGITAL_EXPERIENCE_UI_PRIVILEGES = {
  show: 'show',
  save: 'save',
  manageSessions: 'manageSessions',
} as const;
