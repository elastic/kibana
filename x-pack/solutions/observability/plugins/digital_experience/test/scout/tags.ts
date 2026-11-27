/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every spec sets the flag with `PUT /internal/core/_settings`, which only local servers register
// (`coreApp.allowDynamicConfigOverrides`), so all of them run locally only.

// Flag-on specs.
export const DIGITAL_EXPERIENCE_TAGS = [
  '@local-stateful-classic',
  '@local-serverless-observability_complete',
];

// Stateful only: serverless disables the ux plugin, which the Classic RUM data and the legacy
// navigation need.
export const DIGITAL_EXPERIENCE_WITH_UX_TAGS = ['@local-stateful-classic'];

export const DIGITAL_EXPERIENCE_SERVERLESS_TAGS = ['@local-serverless-observability_complete'];

// Flag-off specs: every Observability project type, Logs Essentials included.
export const DIGITAL_EXPERIENCE_DISABLED_TAGS = [
  '@local-stateful-classic',
  '@local-serverless-observability_complete',
  '@local-serverless-observability_logs_essentials',
];

// Stateful only: the ux plugin, which owns the legacy navigation, is disabled on serverless.
export const DIGITAL_EXPERIENCE_DISABLED_WITH_UX_TAGS = ['@local-stateful-classic'];
