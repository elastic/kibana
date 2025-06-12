/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AnalyticsEvents {
  new_set_created = 'synonyms-new-set-create-action',
  new_rule_created = 'synonyms-new-rule-create-action',
  set_deleted = 'synonyms-set-delete-action',
  rule_deleted = 'synonyms-rule-delete-action',
  rule_updated = 'synonyms-rule-update-action',
}
