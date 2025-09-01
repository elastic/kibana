/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationType } from './constants';
import {
  defaultMonitoringUsersIndex,
  integrationsSourceIndex,
  INTEGRATION_TYPES,
  STREAM_INDEX_PATTERNS,
  getStreamPatternFor,
  OKTA_ADMIN_ROLES,
  AD_ADMIN_ROLES,
  INTEGRATION_MATCHERS_DETAILED,
  getMatchersFor,
} from './constants';

describe('constants', () => {
  const baseIndex = `entity_analytics.privileged_monitoring`;
  const baseMonitoringUsersIndex = '.entity_analytics.monitoring';
  it('should generate defaultMonitoringUsersIndex', () => {
    expect(defaultMonitoringUsersIndex('default')).toBe(`${baseIndex}.default`);
    expect(defaultMonitoringUsersIndex('space1')).toBe(`${baseIndex}.space1`);
  });

  it('should generate integrationsSourceIndex', () => {
    expect(integrationsSourceIndex('default', 'okta')).toBe(
      `${baseMonitoringUsersIndex}.sources.okta-default`
    );
    expect(integrationsSourceIndex('space1', 'ad')).toBe(
      `${baseMonitoringUsersIndex}.sources.ad-space1`
    );
  });

  it('should have correct INTEGRATION_TYPES', () => {
    expect(INTEGRATION_TYPES).toEqual(['okta', 'ad']);
  });

  it('should generate correct stream index patterns', () => {
    expect(STREAM_INDEX_PATTERNS.okta('default')).toBe('logs-entityanalytics_okta.user-default');
    expect(STREAM_INDEX_PATTERNS.ad('space1')).toBe('logs-entityanalytics_ad.user-space1');
  });

  it('getStreamPatternFor returns correct pattern', () => {
    expect(getStreamPatternFor('okta', 'default')).toBe('logs-entityanalytics_okta.user-default');
    expect(getStreamPatternFor('ad', 'space1')).toBe('logs-entityanalytics_ad.user-space1');
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
