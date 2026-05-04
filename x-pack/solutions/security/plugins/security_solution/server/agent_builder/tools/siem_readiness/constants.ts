/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Security detection rule type IDs (alerting framework identifiers). */
export const SECURITY_RULE_TYPE_IDS = [
  'siem.queryRule',
  'siem.eqlRule',
  'siem.esqlRule',
  'siem.mlRule',
  'siem.savedQueryRule',
  'siem.thresholdRule',
  'siem.newTermsRule',
] as const;
