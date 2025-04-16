/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_NAMESPACE } from '@kbn/rule-data-utils';

export const ALERT_ATTACK_DISCOVERY = `${ALERT_NAMESPACE}.attack_discovery` as const;

export const ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT =
  `${ALERT_ATTACK_DISCOVERY}.alerts_context_count` as const;
export const ALERT_ATTACK_DISCOVERY_ALERT_IDS = `${ALERT_ATTACK_DISCOVERY}.alert_ids` as const;
export const ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN =
  `${ALERT_ATTACK_DISCOVERY}.details_markdown` as const;
export const ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS =
  `${ALERT_ATTACK_DISCOVERY}.details_markdown_with_replacements` as const;
export const ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN =
  `${ALERT_ATTACK_DISCOVERY}.entity_summary_markdown` as const;
export const ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS =
  `${ALERT_ATTACK_DISCOVERY}.entity_summary_markdown_with_replacements` as const;
export const ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS =
  `${ALERT_ATTACK_DISCOVERY}.mitre_attack_tactics` as const;
export const ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN =
  `${ALERT_ATTACK_DISCOVERY}.summary_markdown` as const;
export const ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS =
  `${ALERT_ATTACK_DISCOVERY}.summary_markdown_with_replacements` as const;
export const ALERT_ATTACK_DISCOVERY_TITLE = `${ALERT_ATTACK_DISCOVERY}.title` as const;
export const ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS =
  `${ALERT_ATTACK_DISCOVERY}.title_with_replacements` as const;
export const ALERT_ATTACK_DISCOVERY_USER_ID = `${ALERT_ATTACK_DISCOVERY}.user.id` as const;
export const ALERT_ATTACK_DISCOVERY_USER_NAME = `${ALERT_ATTACK_DISCOVERY}.user.name` as const;

// Alert base fields

export const ALERT_RISK_SCORE = `${ALERT_NAMESPACE}.risk_score` as const;

// Replacements
export const ALERT_ATTACK_DISCOVERY_REPLACEMENTS =
  `${ALERT_ATTACK_DISCOVERY}.replacements` as const;
export const ALERT_ATTACK_DISCOVERY_REPLACEMENTS_VALUE =
  `${ALERT_ATTACK_DISCOVERY}.replacements.value` as const;
export const ALERT_ATTACK_DISCOVERY_REPLACEMENTS_UUID =
  `${ALERT_ATTACK_DISCOVERY}.replacements.uuid` as const;

// API config
export const ALERT_ATTACK_DISCOVERY_API_CONFIG = `${ALERT_ATTACK_DISCOVERY}.api_config` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_ACTION_TYPE_ID =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.action_type_id` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_CONNECTOR_ID =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.connector_id` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_MODEL =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.model` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.name` as const;
export const ALERT_ATTACK_DISCOVERY_API_CONFIG_PROVIDER =
  `${ALERT_ATTACK_DISCOVERY_API_CONFIG}.provider` as const;

// Users
export const ALERT_ATTACK_DISCOVERY_USERS = `${ALERT_ATTACK_DISCOVERY}.users` as const;
export const ALERT_ATTACK_DISCOVERY_USERS_ID = `${ALERT_ATTACK_DISCOVERY_USERS}.id` as const;
export const ALERT_ATTACK_DISCOVERY_USERS_NAME = `${ALERT_ATTACK_DISCOVERY_USERS}.name` as const;
