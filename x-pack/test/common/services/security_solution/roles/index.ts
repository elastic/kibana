/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import serverlessRoleDefinitions from '@kbn/es/src/serverless_resources/security_roles.json';
import essRoleDefinitions from './ess_roles.json';

type ServerlessSecurityRoleName = keyof typeof serverlessRoleDefinitions;
type EssSecurityRoleName = keyof typeof essRoleDefinitions;

export const KNOWN_SERVERLESS_ROLE_DEFINITIONS = serverlessRoleDefinitions;
export const KNOWN_ESS_ROLE_DEFINITIONS = essRoleDefinitions;

export type SecurityRoleName = ServerlessSecurityRoleName | EssSecurityRoleName;

export enum ROLES {
  // Serverless roles
  t1_analyst = 't1_analyst',
  t2_analyst = 't2_analyst',
  t3_analyst = 't3_analyst',
  rule_author = 'rule_author',
  soc_manager = 'soc_manager',
  detections_admin = 'detections_admin',
  platform_engineer = 'platform_engineer',
  // ESS roles
  reader = 'reader',
  hunter = 'hunter',
  hunter_no_actions = 'hunter_no_actions',
}
