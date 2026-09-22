/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { ALERTZERO_ACTIONS_URL } from '@kbn/alertzero-common';

/** Internal APIs require the internal-origin header and an explicit version. */
export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

/**
 * `ALERTZERO_ACTIONS_URL` is absolute (`/internal/alertzero/actions`); Scout's
 * apiClient takes a path without the leading slash.
 */
export const LIST_ACTIONS_PATH = ALERTZERO_ACTIONS_URL.replace(/^\//, '');

/**
 * Ids and categories of the action workflows AlertZero installs at start.
 *
 * Deliberately literals rather than imports from `@kbn/workflows/managed`: that
 * barrel pulls in the managed workflow definitions, which raw-import their
 * `.yaml` files, and Playwright's transpiler cannot resolve a YAML import — the
 * whole spec fails to load. The ids are part of the catalog's observable
 * contract, so restating them here is also the point: if one changes upstream,
 * this suite fails loudly instead of silently asserting on whatever is installed.
 */
export const ACTION_IDS_BY_CATEGORY = {
  configure: [
    'system-alertzero-action-create-rule',
    'system-alertzero-action-edit-rule',
    'system-alertzero-action-add-rule-exception',
  ],
  respond: [
    'system-alertzero-action-isolate-host',
    'system-alertzero-action-kill-process',
    'system-alertzero-action-suspend-process',
  ],
  investigate: ['system-alertzero-action-handoff-to-forensics'],
} as const;

export const ALL_ACTION_IDS = [
  ...ACTION_IDS_BY_CATEGORY.configure,
  ...ACTION_IDS_BY_CATEGORY.respond,
  ...ACTION_IDS_BY_CATEGORY.investigate,
];

export const ISOLATE_HOST_ACTION_ID = 'system-alertzero-action-isolate-host';

/** Mirrors `ACTION_CATEGORIES_QUERY_PARAM_MAX_ITEMS` in the route. */
export const CATEGORIES_MAX_ITEMS = 20;

/**
 * Grants `alertzero_read` through the AlertZero feature's `read` privilege — the
 * privilege the route requires.
 */
export const ALERTZERO_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { alertzero: ['read'] }, spaces: ['*'] }],
};

/**
 * A fully-provisioned Kibana user that holds no AlertZero privilege at all. Used
 * to prove the route's authz is a real boundary rather than an authentication
 * side effect: this user is logged in, just not entitled.
 */
export const NO_ALERTZERO_PRIVILEGE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
};
