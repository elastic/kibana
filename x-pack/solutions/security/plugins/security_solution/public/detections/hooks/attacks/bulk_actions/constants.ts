/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Field name for attack IDs that reference related alerts.
 * This field contains an array of alert IDs that are associated with the attack.
 */
export const ALERT_ATTACK_DISCOVERY_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids' as const;

/**
 * Field name for markdown comment generated from an attack.
 * This field is used to pass the precomputed markdown payload into bulk case actions.
 */
export const ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT =
  'kibana.alert.attack_discovery.markdown_comment' as const;
