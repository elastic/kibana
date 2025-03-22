/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_NAMESPACE } from '@kbn/rule-data-utils';

export const ALERT_ATTACK_DISCOVERY = `${ALERT_NAMESPACE}.attack_discovery` as const;

export const ALERT_ATTACK_DISCOVERY_TITLE = `${ALERT_ATTACK_DISCOVERY}.title` as const;
export const ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN =
  `${ALERT_ATTACK_DISCOVERY}.details_markdown` as const;
export const ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN =
  `${ALERT_ATTACK_DISCOVERY}.summary_markdown` as const;
export const ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN =
  `${ALERT_ATTACK_DISCOVERY}.entity_summary_markdown` as const;
export const ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS =
  `${ALERT_ATTACK_DISCOVERY}.mitre_attack_tactics` as const;
export const ALERT_ATTACK_DISCOVERY_ALERT_IDS = `${ALERT_ATTACK_DISCOVERY}.alert_ids` as const;
export const ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT =
  `${ALERT_ATTACK_DISCOVERY}.alerts_context_count` as const;

// Users
export const ALERT_ATTACK_DISCOVERY_USERS = `${ALERT_ATTACK_DISCOVERY}.users` as const;
export const ALERT_ATTACK_DISCOVERY_USER_ID = `${ALERT_ATTACK_DISCOVERY_USERS}.id` as const;
export const ALERT_ATTACK_DISCOVERY_USER_NAME = `${ALERT_ATTACK_DISCOVERY_USERS}.name` as const;

// Replacements
export const ALERT_ATTACK_DISCOVERY_REPLACEMENTS =
  `${ALERT_ATTACK_DISCOVERY}.replacements` as const;
export const ALERT_ATTACK_DISCOVERY_REPLACEMENT_VALUE =
  `${ALERT_ATTACK_DISCOVERY_REPLACEMENTS}.value` as const;
export const ALERT_ATTACK_DISCOVERY_REPLACEMENT_UUID =
  `${ALERT_ATTACK_DISCOVERY_REPLACEMENTS}.uuid` as const;

// API config
export const ALERT_ATTACK_DISCOVERY_API_CONFIG = `${ALERT_ATTACK_DISCOVERY}.api_config` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_CONNECTOR_ID =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.connector_id` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_ACTION_TYPE_ID =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.action_type_id` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_DEFAULT_SYSTEM_PROMPT_ID =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.default_system_prompt_id` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_PROVIDER =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.provider` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_MODEL =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.model` as const;
