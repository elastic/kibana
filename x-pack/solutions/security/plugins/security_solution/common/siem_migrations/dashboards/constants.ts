/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIEM_MIGRATIONS_PATH } from '../constants';

export const SIEM_DASHBOARD_MIGRATIONS_PATH = `${SIEM_MIGRATIONS_PATH}/dashboards` as const;

export const SIEM_DASHBOARD_MIGRATION_PATH =
  `${SIEM_DASHBOARD_MIGRATIONS_PATH}/{migration_id}` as const;

export const SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH =
  `${SIEM_DASHBOARD_MIGRATION_PATH}/dashboards` as const;
