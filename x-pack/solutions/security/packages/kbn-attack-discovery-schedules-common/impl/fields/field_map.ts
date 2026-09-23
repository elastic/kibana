/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/alerts-as-data-utils';
import { alertFieldMap } from '@kbn/alerts-as-data-utils';
import { ALERT_WORKFLOW_STATUS_UPDATED_AT } from '@kbn/rule-data-utils';
import {
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_ACTION_TYPE_ID,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_CONNECTOR_ID,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_MODEL,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_PROVIDER,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS_UUID,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS_VALUE,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_ATTACK_DISCOVERY_USERS_ID,
  ALERT_ATTACK_DISCOVERY_USERS_NAME,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
  ALERT_RISK_SCORE,
  ALERT_ATTACK_IDS,
} from '@kbn/elastic-assistant-common';

/**
 * Field map for attack discovery alerts - defines the Elasticsearch mappings
 * for fields stored in attack discovery alert documents.
 *
 * CANONICAL COPY. A deliberate fork of this map lives at
 * `x-pack/solutions/security/packages/kbn-discoveries/impl/attack_discovery/alert_fields/alert_field_map.ts`,
 * kept so that `@kbn/discoveries` can eventually become a standalone package. Do NOT
 * de-duplicate the two copies.
 *
 * Both copies are installed into the SAME component template
 * (`.adhoc.alerts-security.attack.discovery.alerts-mappings`) — `elastic_assistant` installs
 * this one, the `discoveries` plugin installs the fork — so if they drift, the installed
 * mappings depend on plugin install order. Every change here MUST be mirrored in the fork,
 * and vice versa.
 *
 * Parity is enforced by
 * `x-pack/solutions/security/plugins/discoveries/server/attack_discovery_index_parity.test.ts`.
 */
export const attackDiscoveryAlertFieldMap: FieldMap = {
  ...alertFieldMap,

  /**
   * Alert base fields
   */

  [ALERT_RISK_SCORE]: {
    type: 'float',
    array: false,
    required: false,
  },
  [ALERT_WORKFLOW_STATUS_UPDATED_AT]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_IDS]: {
    type: 'keyword',
    array: true,
    required: false,
  },

  /**
   * Attack discovery fields
   */
  [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]: {
    type: 'integer',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: {
    type: 'keyword',
    array: true,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
    type: 'object',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_ACTION_TYPE_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_CONNECTOR_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_MODEL]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_PROVIDER]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]: {
    type: 'text',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]: {
    type: 'text',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]: {
    type: 'object',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_REPLACEMENTS_VALUE]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_REPLACEMENTS_UUID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_TITLE]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_USER_ID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_USER_NAME]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_USERS]: {
    type: 'nested',
    array: true,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_USERS_ID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_USERS_NAME]: {
    type: 'keyword',
    array: false,
    required: true,
  },
} as const;
