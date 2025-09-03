/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  defaultMonitoringUsersIndex,
  integrationsSourceIndex,
  INTEGRATION_TYPES,
  STREAM_INDEX_PATTERNS,
  getStreamPatternFor,
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
});
