/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Local only: the flag is turned on through server args, which Cloud deployments do not accept.
export const DIGITAL_EXPERIENCE_TAGS = [
  '@local-stateful-classic',
  '@local-serverless-observability_complete',
];

// Stateful only: the ux plugin (Classic RUM dashboard, legacy navigation) is disabled on serverless.
export const DIGITAL_EXPERIENCE_WITH_UX_TAGS = ['@local-stateful-classic'];
