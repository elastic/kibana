/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

/**
 * Translate a raw action identifier (e.g. `rule_create`) into a human-readable
 * sentence fragment. Unknown actions are surfaced as the verbatim action key
 * with underscores stripped, so we never silently drop information when the
 * alerting framework starts emitting a new action type.
 */
export function describeAction(action: string): string {
  return KNOWN_ACTION_LABELS[action] ?? action.replaceAll('_', ' ');
}

const KNOWN_ACTION_LABELS: Record<string, string> = {
  rule_create: i18n.ACTION_RULE_CREATE,
  rule_update: i18n.ACTION_RULE_UPDATE,
  rule_enable: i18n.ACTION_RULE_ENABLE,
  rule_disable: i18n.ACTION_RULE_DISABLE,
  rule_snooze: i18n.ACTION_RULE_SNOOZE,
  rule_unsnooze: i18n.ACTION_RULE_UNSNOOZE,
  rule_bulk_edit: i18n.ACTION_RULE_BULK_EDIT,
  rule_api_key_update: i18n.ACTION_RULE_API_KEY_UPDATE,
};
