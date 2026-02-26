/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicSettings } from '../runtime_types';

export const MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL = 5;
export const MAX_PRIVATE_LOCATIONS_SYNC_INTERVAL = 1440;

export const DYNAMIC_SETTINGS_DEFAULTS: DynamicSettings & { privateLocationsSyncInterval: number } =
  {
    certAgeThreshold: 730,
    certExpirationThreshold: 30,
    defaultConnectors: [],
    defaultEmail: {
      to: [],
      cc: [],
      bcc: [],
    },
    defaultTLSRuleEnabled: true,
    defaultStatusRuleEnabled: true,
    privateLocationsSyncInterval: MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL,
  };
