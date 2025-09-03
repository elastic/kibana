/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationType } from '../../../../../common/constants';

export interface Matcher {
  values: string[];
  fields: string[];
}

export const OKTA_ADMIN_ROLES: string[] = [
  'Super Administrator',
  'Organization Administrator',
  'Group Administrator',
  'Application Administrator',
  'Mobile Administrator',
  'Help Desk Administrator',
  'Report Administrator',
  'API Access Management Administrator',
  'Group Membership Administrator',
  'Read-only Administrator',
];

export const AD_ADMIN_ROLES: string[] = ['Domain Admins', 'Enterprise Admins'];

export const INTEGRATION_MATCHERS_DETAILED: Record<IntegrationType, Matcher> = {
  okta: { fields: ['user.roles'], values: OKTA_ADMIN_ROLES },
  ad: { fields: ['user.roles'], values: AD_ADMIN_ROLES },
};

export const getMatchersFor = (integration: IntegrationType): Matcher[] => [
  INTEGRATION_MATCHERS_DETAILED[integration],
];
