/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID } from './constants';

// The prefix ("securitySolution-") must be used by all the Security Solution API action privileges.
// This ensures product features are honored by the Kibana routes security authz.
export const API_ACTION_PREFIX = `${APP_ID}-`;

export const SIEM_MIGRATIONS_API_ACTION_ALL = `${API_ACTION_PREFIX}siemMigrationsAll`;
