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
