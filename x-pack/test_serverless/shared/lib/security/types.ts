/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ServerlessRoleName {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  T1_ANALYST = 't1_analyst',
  T2_ANALYST = 't2_analyst',
  T3_ANALYST = 't3_analyst',
  THREAT_INTELLIGENCE_ANALYST = 'threat_intelligence_analyst',
  RULE_AUTHOR = 'rule_author',
  SOC_MANAGER = 'soc_manager',
  DETECTIONS_ADMIN = 'detections_admin',
  PLATFORM_ENGINEER = 'platform_engineer',
  ENDPOINT_OPERATIONS_ANALYST = 'endpoint_operations_analyst',
  ENDPOINT_POLICY_MANAGER = 'endpoint_policy_manager',
  READER = 'reader', // custom role to test lack of permissions
}
