/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defaultMonitoringUsersIndex } from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import type { IntegrationType } from './constants';
import {
  getMatchersFor,
  getStreamPatternFor,
  INTEGRATION_MATCHERS_DETAILED,
  INTEGRATION_TYPES,
  integrationsSourceIndex,
  OKTA_ADMIN_ROLES,
  STREAM_INDEX_PATTERNS,
} from './constants';

describe('constants', () => {
  const baseIndex = `entity_analytics.privileged_monitoring`;
  const baseMonitoringUsersIndex = '.entity_analytics.monitoring';
  it('should export all constants', () => {
    expect(getMatchersFor).toBeDefined();
  });
  it('should have correct OKTA_ADMIN_ROLES', () => {
    expect(OKTA_ADMIN_ROLES).toMatchInlineSnapshot(`
  Array [
    "Super Administrator",
    "Organization Administrator",
    "Group Administrator",
    "Application Administrator",
    "Mobile Administrator",
    "Help Desk Administrator",
    "Report Administrator",
    "API Access Management Administrator",
    "Group Membership Administrator",
    "Read-only Administrator",
  ]
`);
  });

  /* it('should have correct AD_ADMIN_ROLES', () => {
    expect(AD_ADMIN_ROLES).toEqual(['Domain Admins', 'Enterprise Admins']);
    expect(AD_ADMIN_ROLES.length).toBe(2);
  });*/

  it('should have correct INTEGRATION_MATCHERS_DETAILED', () => {
    expect(INTEGRATION_MATCHERS_DETAILED.entityanalytics_okta.values).toEqual(OKTA_ADMIN_ROLES);
    // expect(INTEGRATION_MATCHERS_DETAILED.ad.values).toEqual(AD_ADMIN_ROLES);
    expect(INTEGRATION_MATCHERS_DETAILED.entityanalytics_okta.fields).toEqual(['user.roles']);
    // expect(INTEGRATION_MATCHERS_DETAILED.ad.fields).toEqual(['user.roles']);
  });

  it('getMatchersFor returns correct matcher array', () => {
    expect(getMatchersFor('entityanalytics_okta')).toEqual([
      INTEGRATION_MATCHERS_DETAILED.entityanalytics_okta,
    ]);
    // expect(getMatchersFor('ad')).toEqual([INTEGRATION_MATCHERS_DETAILED.ad]); add ad in follow-up PR
  });

  it('IntegrationType type should only allow okta and ad', () => {
    const types: IntegrationType[] = ['entityanalytics_okta']; // add ad in follow-up PR
    expect(types).toEqual(INTEGRATION_TYPES);
  });

  it('should generate defaultMonitoringUsersIndex', () => {
    expect(defaultMonitoringUsersIndex('default')).toBe(`${baseIndex}.default`);
    expect(defaultMonitoringUsersIndex('space1')).toBe(`${baseIndex}.space1`);
  });

  it('should generate integrationsSourceIndex', () => {
    expect(integrationsSourceIndex('default', 'entityanalytics_okta')).toBe(
      `${baseMonitoringUsersIndex}.sources.entityanalytics_okta-default`
    );
    /* expect(integrationsSourceIndex('space1', 'ad')).toBe(
      `${baseMonitoringUsersIndex}.sources.ad-space1`
    ); */
  });

  it('should generate correct stream index patterns', () => {
    expect(STREAM_INDEX_PATTERNS.entityanalytics_okta('default')).toBe(
      'logs-entityanalytics_okta.user-default'
    );
    // expect(STREAM_INDEX_PATTERNS.ad('space1')).toBe('logs-entityanalytics_ad.user-space1');
  });

  it('getStreamPatternFor returns correct pattern', () => {
    expect(getStreamPatternFor('entityanalytics_okta', 'default')).toBe(
      'logs-entityanalytics_okta.user-default'
    );
    // expect(getStreamPatternFor('ad', 'space1')).toBe('logs-entityanalytics_ad.user-space1');
  });
});
