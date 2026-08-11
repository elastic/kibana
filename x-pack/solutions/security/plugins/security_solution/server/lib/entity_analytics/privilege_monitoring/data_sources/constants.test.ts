/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defaultMonitoringUsersIndex } from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import { getStreamPatternFor, integrationsSourceIndex, STREAM_INDEX_PATTERNS } from './constants';
import { getMatchersFor, INTEGRATION_MATCHERS_DETAILED } from './matchers';

describe('constants', () => {
  const baseIndex = `entity_analytics.privileged_monitoring`;
  const baseMonitoringUsersIndex = '.entity_analytics.monitoring';

  it('getMatchersFor returns correct matcher array', () => {
    expect(getMatchersFor('entityanalytics_okta')).toEqual([
      INTEGRATION_MATCHERS_DETAILED.entityanalytics_okta,
    ]);
    expect(getMatchersFor('entityanalytics_ad')).toEqual([
      INTEGRATION_MATCHERS_DETAILED.entityanalytics_ad,
    ]);
  });

  it('should generate defaultMonitoringUsersIndex', () => {
    expect(defaultMonitoringUsersIndex('default')).toBe(`${baseIndex}.default`);
    expect(defaultMonitoringUsersIndex('space1')).toBe(`${baseIndex}.space1`);
  });

  it('should generate integrationsSourceIndex', () => {
    expect(integrationsSourceIndex('default', 'entityanalytics_okta')).toBe(
      `${baseMonitoringUsersIndex}.sources.entityanalytics_okta-default`
    );
    expect(integrationsSourceIndex('space1', 'entityanalytics_ad')).toBe(
      `${baseMonitoringUsersIndex}.sources.entityanalytics_ad-space1`
    );
  });

  it('should generate correct stream index patterns', () => {
    expect(STREAM_INDEX_PATTERNS.entityanalytics_okta('default')).toBe(
      'logs-entityanalytics_okta.user-default'
    );
    expect(STREAM_INDEX_PATTERNS.entityanalytics_ad('space1')).toBe(
      'logs-entityanalytics_ad.user-space1'
    );
  });

  it('getStreamPatternFor returns correct pattern', () => {
    expect(getStreamPatternFor('entityanalytics_okta', 'default')).toBe(
      'logs-entityanalytics_okta.user-default'
    );
    expect(getStreamPatternFor('entityanalytics_ad', 'space1')).toBe(
      'logs-entityanalytics_ad.user-space1'
    );
  });
});
