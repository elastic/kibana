/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENCODED_POWERSHELL_ATTACK_ID } from './constants';

/**
 * Turns the authored attack narrative into a document the adhoc AD alerts index will accept.
 */
export const toAttackAlertDocument = (
  attack: Record<string, unknown>
): Record<string, unknown> => ({
  ...attack,
  'kibana.alert.rule.rule_type_id': 'attack-discovery',
  'kibana.alert.workflow_status': 'open',
  'kibana.alert.status': 'active',
  'kibana.alert.uuid': attack['kibana.alert.uuid'] ?? ENCODED_POWERSHELL_ATTACK_ID,
});
