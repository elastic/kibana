/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSource } from './types/applications';

/** Where an application's data comes from: EDOT Browser, the Classic RUM agent or EDOT mobile. */
export const APPLICATION_SOURCE = {
  otel: 'otel',
  classic: 'classic',
  mobile: 'mobile',
} as const satisfies Record<ApplicationSource, ApplicationSource>;
