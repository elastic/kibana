/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import {
  buildRumAlertEsql,
  buildRumEmailWorkflowYaml,
  esqlString,
  rumAlertDefaults,
  rumAlertServiceFromQuery,
  rumAlertServiceFromTags,
  RUM_ALERT_TEMPLATE_IDS,
} from './rum_alerts';

describe('esqlString', () => {
  it('escapes quotes and backslashes', () => {
    expect(esqlString('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});

describe('buildRumAlertEsql', () => {
  it('builds a per-page LCP threshold query', () => {
    const built = buildRumAlertEsql({
      templateId: 'web_vital',
      threshold: 2500,
      minSamples: 8,
      groupByPage: true,
      lookback: '15m',
      every: '5m',
      vital: 'lcp',
      filters: { serviceName: 'shop' },
    });
    expect(built.query).toContain('FROM logs-*.otel-*');
    expect(built.query).toContain('attributes.browser.web_vital.name');
    expect(built.query).toContain('"lcp"');
    expect(built.query).toContain('p75 > 2500');
    expect(built.query).toContain('samples >= 8');
    expect(built.query).toContain('resource.attributes.service.name');
    expect(built.groupingFields).toEqual(['page']);
    expect(built.tags).toEqual(['ux-rum', 'ux-rum:web_vital', 'ux-rum-service:shop']);
  });

  it('builds an error-rate query without page grouping', () => {
    const built = buildRumAlertEsql({
      templateId: 'error_rate',
      threshold: 0.1,
      minSamples: 20,
      groupByPage: false,
      lookback: '15m',
      every: '5m',
      filters: {},
    });
    expect(built.query).toContain('EVAL is_error');
    expect(built.query).toContain('TO_DOUBLE(errors) / views');
    expect(built.query).toContain('error_rate > 0.1');
    expect(built.groupingFields).toEqual([]);
  });

  it('scopes an error spike to type and message prefix', () => {
    const built = buildRumAlertEsql({
      templateId: 'error_spike',
      threshold: 12,
      minSamples: 1,
      groupByPage: false,
      lookback: '15m',
      every: '1m',
      errorType: 'TypeError',
      errorMessage: 'Cannot read',
      filters: {},
    });
    expect(built.query).toContain('attributes.exception.type');
    expect(built.query).toContain('"TypeError"');
    expect(built.query).toContain('LIKE "Cannot read*"');
    expect(built.query).toContain('events >= 12');
  });

  it('builds a traffic-drop query without page grouping', () => {
    const built = buildRumAlertEsql({
      templateId: 'traffic_drop',
      threshold: 3,
      minSamples: 1,
      groupByPage: true,
      lookback: '30m',
      every: '5m',
      filters: { location: 'DE' },
    });
    expect(built.noDataStrategy).toBe('none');
    expect(built.groupingFields).toEqual([]);
    expect(built.query).toContain('COUNT_DISTINCT');
    expect(built.query).toContain('sessions < 3');
  });

  it('builds a traffic-spike query as a session ceiling', () => {
    const built = buildRumAlertEsql({
      templateId: 'traffic_spike',
      threshold: 80,
      minSamples: 1,
      groupByPage: true,
      lookback: '15m',
      every: '5m',
      filters: { serviceName: 'shop' },
    });
    expect(built.groupingFields).toEqual([]);
    expect(built.query).toContain('COUNT_DISTINCT');
    expect(built.query).toContain('sessions > 80');
    expect(built.query).not.toContain('sessions <');
    expect(built.tags).toEqual(['ux-rum', 'ux-rum:traffic_spike', 'ux-rum-service:shop']);
    expect(built.description).toContain('> 80');
  });

  it('builds session-level queries on the session index', () => {
    const errorRate = buildRumAlertEsql({
      templateId: 'session_error_rate',
      threshold: 0.1,
      minSamples: 20,
      groupByPage: true,
      lookback: '15m',
      every: '5m',
      filters: { serviceName: 'shop' },
    });
    expect(errorRate.query).toContain('FROM ux-rum-sessions-*');
    expect(errorRate.query).toContain('error_count > 0');
    expect(errorRate.query).toContain('service.name');
    expect(errorRate.query).toContain('error_rate > 0.1');
    expect(errorRate.groupingFields).toEqual([]);

    const traffic = buildRumAlertEsql({
      templateId: 'session_traffic_drop',
      threshold: 3,
      minSamples: 1,
      groupByPage: true,
      lookback: '30m',
      every: '5m',
      filters: { location: 'DE' },
    });
    expect(traffic.query).toContain('STATS sessions = COUNT(*)');
    expect(traffic.query).toContain('sessions < 3');
    expect(traffic.query).toContain('country_iso');
    expect(traffic.query).not.toContain('COUNT_DISTINCT');
  });

  it('uses a placeholder query until AI ES|QL is supplied', () => {
    const built = buildRumAlertEsql({
      templateId: 'ai',
      threshold: 0,
      minSamples: 1,
      groupByPage: false,
      lookback: '15m',
      every: '5m',
      prompt: 'LCP over 4s',
      filters: {},
    });
    expect(built.query).toContain('WHERE false');
    expect(built.tags).toEqual(['ux-rum', 'ux-rum:ai']);
  });
});

describe('buildRumEmailWorkflowYaml', () => {
  it('embeds the connector and recipients', () => {
    const yaml = buildRumEmailWorkflowYaml('conn-1', ['ops@example.com', 'sre@example.com']);
    expect(yaml).toContain('type: manual');
    expect(yaml).toContain('#/kibana/definitions/alertingV2NotificationGroup');
    expect(yaml).toContain('connector-id: "conn-1"');
    expect(yaml).toContain('ops@example.com');
    expect(yaml).toContain('sre@example.com');
  });
});

describe('ES|QL parser', () => {
  it.each(RUM_ALERT_TEMPLATE_IDS)('parses the %s template', (templateId) => {
    const built = buildRumAlertEsql({
      templateId,
      threshold: rumAlertDefaults(templateId).threshold,
      minSamples: rumAlertDefaults(templateId).minSamples,
      groupByPage: true,
      lookback: rumAlertDefaults(templateId).lookback,
      every: rumAlertDefaults(templateId).every,
      vital: 'lcp',
      errorType: 'TypeError',
      filters: { serviceName: 'shop' },
    });
    expect(validateEsqlQuery(built.query)).toBeUndefined();
  });
});

describe('rumAlertServiceFromTags', () => {
  it('reads the scoped service tag', () => {
    expect(rumAlertServiceFromTags(['ux-rum', 'ux-rum-service:shop'])).toBe('shop');
    expect(rumAlertServiceFromTags(['ux-rum'])).toBeUndefined();
  });
});

describe('rumAlertServiceFromQuery', () => {
  it('parses OTel and session service predicates', () => {
    expect(
      rumAlertServiceFromQuery('`resource.attributes.service.name` == "weather-demo-app"')
    ).toBe('weather-demo-app');
    expect(rumAlertServiceFromQuery('`service.name` == "shop"')).toBe('shop');
  });
});

describe('rumAlertDefaults', () => {
  it('returns per-template defaults', () => {
    expect(rumAlertDefaults('web_vital').threshold).toBe(4000);
    expect(rumAlertDefaults('error_rate').threshold).toBe(0.05);
    expect(rumAlertDefaults('traffic_spike').threshold).toBe(50);
  });
});
