/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';

// Flag-on specs. Local only: they ingest mock data and set up sessions transforms, which haven't
// been tried against Cloud deployments yet.
export const DIGITAL_EXPERIENCE_TAGS = [
  '@local-stateful-classic',
  '@local-serverless-observability_complete',
];

// Stateful only: serverless disables the ux plugin, which the Classic RUM data and the legacy
// navigation need.
export const DIGITAL_EXPERIENCE_WITH_UX_TAGS = ['@local-stateful-classic'];

export const DIGITAL_EXPERIENCE_SERVERLESS_TAGS = ['@local-serverless-observability_complete'];

// Flag-off specs: every Observability deployment, Cloud included. They turn the flag off
// themselves, so a rollout rule for the deployment doesn't change what they test.
export const DIGITAL_EXPERIENCE_DISABLED_TAGS = [
  ...tags.stateful.classic,
  ...tags.serverless.observability.all,
];

// Stateful only: the ux plugin, which owns the legacy navigation, is disabled on serverless.
export const DIGITAL_EXPERIENCE_DISABLED_WITH_UX_TAGS = tags.stateful.classic;
