/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMap } from '@kbn/alerts-as-data-utils';
import {
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_ACTION_TYPE_ID,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_CONNECTOR_ID,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_DEFAULT_SYSTEM_PROMPT_ID,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_MODEL,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_PROVIDER,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENT_UUID,
  ALERT_ATTACK_DISCOVERY_REPLACEMENT_VALUE,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
} from './field_names';

export const attackDiscoveryRuleFieldMap: FieldMap = {
  [ALERT_ATTACK_DISCOVERY_USERS]: {
    type: 'nested',
    array: true,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_USER_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_USER_NAME]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_TITLE]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: {
    type: 'text',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: {
    type: 'keyword',
    array: true,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]: {
    type: 'object',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_REPLACEMENT_VALUE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_REPLACEMENT_UUID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
    type: 'object',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_CONNECTOR_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_ACTION_TYPE_ID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_DEFAULT_SYSTEM_PROMPT_ID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_PROVIDER]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_API_CONFIG_MODEL]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]: {
    type: 'integer',
    array: false,
    required: false,
  },
} as const;
