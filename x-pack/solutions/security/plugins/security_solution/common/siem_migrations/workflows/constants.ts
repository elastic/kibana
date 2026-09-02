/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIEM_MIGRATIONS_PATH } from '../constants';

export const SIEM_WORKFLOW_MIGRATIONS_PATH = `${SIEM_MIGRATIONS_PATH}/workflows` as const;

export const SIEM_WORKFLOW_MIGRATIONS_TRANSLATE_PATH =
  `${SIEM_WORKFLOW_MIGRATIONS_PATH}/translate` as const;

export const SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH =
  `${SIEM_WORKFLOW_MIGRATIONS_PATH}/stats` as const;

export const SIEM_WORKFLOW_MIGRATION_PATH =
  `${SIEM_WORKFLOW_MIGRATIONS_PATH}/{migration_id}` as const;

export const SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH =
  `${SIEM_WORKFLOW_MIGRATION_PATH}/workflows` as const;

export const SIEM_WORKFLOW_MIGRATION_STATS_PATH =
  `${SIEM_WORKFLOW_MIGRATION_PATH}/stats` as const;

export const SIEM_WORKFLOW_MIGRATION_START_PATH =
  `${SIEM_WORKFLOW_MIGRATION_PATH}/start` as const;

export const SIEM_WORKFLOW_MIGRATION_STOP_PATH = `${SIEM_WORKFLOW_MIGRATION_PATH}/stop` as const;

/**
 * Tag applied to workflows created from Tines migrations so they can be listed
 * on the Translated workflows page via the Workflows search API.
 */
export const TINES_MIGRATION_WORKFLOW_TAG = 'tines-migration' as const;
