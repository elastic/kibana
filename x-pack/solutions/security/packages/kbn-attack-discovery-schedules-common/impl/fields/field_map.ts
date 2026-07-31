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
  ALERT_ATTACK_DISCOVERY_CONFIDENCE,
  ALERT_ATTACK_DISCOVERY_CONFIDENCE_SCORE,
  ALERT_ATTACK_DISCOVERY_CONFIDENCE_BAND,
  ALERT_ATTACK_DISCOVERY_CONFIDENCE_RATIONALE,
  ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS,
  ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS_NAME,
  ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS_ASSESSMENT,
  ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS_WEIGHT,
  ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS_EVIDENCE,
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
  // Optional calibrated confidence object. MUST stay byte-identical to the
  // kbn-discoveries alert field map (the two indices share a generated schema).
  [ALERT_ATTACK_DISCOVERY_CONFIDENCE]: {
    type: 'object',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_CONFIDENCE_SCORE]: {
    type: 'float',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_CONFIDENCE_BAND]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_CONFIDENCE_RATIONALE]: {
    type: 'text',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS]: {
    type: 'nested',
    array: true,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS_NAME]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS_ASSESSMENT]: {
    type: 'text',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS_WEIGHT]: {
    type: 'float',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_CONFIDENCE_FACTORS_EVIDENCE]: {
    type: 'text',
    array: false,
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
