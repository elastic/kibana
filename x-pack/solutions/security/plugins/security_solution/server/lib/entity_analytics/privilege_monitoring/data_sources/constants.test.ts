/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationType } from '../../../../../common/constants';
import { INTEGRATION_TYPES } from '../../../../../common/constants';
import {
  AD_ADMIN_ROLES,
  getMatchersFor,
  INTEGRATION_MATCHERS_DETAILED,
  OKTA_ADMIN_ROLES,
} from './constants';

describe('constants', () => {
  it('should export all constants', () => {
    expect(getMatchersFor).toBeDefined();
  });
  it('should have correct OKTA_ADMIN_ROLES', () => {
    expect(OKTA_ADMIN_ROLES).toContain('Super Administrator');
    expect(OKTA_ADMIN_ROLES).toContain('Organization Administrator');
    expect(OKTA_ADMIN_ROLES).toContain('Group Administrator');
    expect(OKTA_ADMIN_ROLES).toContain('Application Administrator');
    expect(OKTA_ADMIN_ROLES).toContain('Mobile Administrator');
    expect(OKTA_ADMIN_ROLES).toContain('Help Desk Administrator');
    expect(OKTA_ADMIN_ROLES).toContain('Report Administrator');
    expect(OKTA_ADMIN_ROLES).toContain('API Access Management Administrator');
    expect(OKTA_ADMIN_ROLES).toContain('Group Membership Administrator');
    expect(OKTA_ADMIN_ROLES).toContain('Read-only Administrator');
    expect(OKTA_ADMIN_ROLES.length).toBe(10);
  });

  it('should have correct AD_ADMIN_ROLES', () => {
    expect(AD_ADMIN_ROLES).toEqual(['Domain Admins', 'Enterprise Admins']);
    expect(AD_ADMIN_ROLES.length).toBe(2);
  });

  it('should have correct INTEGRATION_MATCHERS_DETAILED', () => {
    expect(INTEGRATION_MATCHERS_DETAILED.okta.values).toEqual(OKTA_ADMIN_ROLES);
    expect(INTEGRATION_MATCHERS_DETAILED.ad.values).toEqual(AD_ADMIN_ROLES);
    expect(INTEGRATION_MATCHERS_DETAILED.okta.fields).toEqual(['user.roles']);
    expect(INTEGRATION_MATCHERS_DETAILED.ad.fields).toEqual(['user.roles']);
  });

  it('getMatchersFor returns correct matcher array', () => {
    expect(getMatchersFor('okta')).toEqual([INTEGRATION_MATCHERS_DETAILED.okta]);
    expect(getMatchersFor('ad')).toEqual([INTEGRATION_MATCHERS_DETAILED.ad]);
  });

  it('IntegrationType type should only allow okta and ad', () => {
    const types: IntegrationType[] = ['okta', 'ad'];
    expect(types).toEqual(INTEGRATION_TYPES);
  });
});
