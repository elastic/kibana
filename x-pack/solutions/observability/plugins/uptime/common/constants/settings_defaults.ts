/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicSettings } from '../runtime_types';

export const MAX_DEFAULT_CONNECTORS_PER_REQUEST = 100;
export const MAX_DEFAULT_EMAIL_TO_PER_REQUEST = 50;
export const MAX_DEFAULT_EMAIL_CC_PER_REQUEST = 50;
export const MAX_DEFAULT_EMAIL_BCC_PER_REQUEST = 50;

export const DYNAMIC_SETTINGS_DEFAULTS: DynamicSettings = {
  heartbeatIndices: 'heartbeat-*',
  certAgeThreshold: 730,
  certExpirationThreshold: 30,
  defaultConnectors: [],
  defaultEmail: {
    to: [],
    cc: [],
    bcc: [],
  },
};
