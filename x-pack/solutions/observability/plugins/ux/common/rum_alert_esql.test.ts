/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertRumAlertEsql,
  esqlLookbackLiteral,
  extractRumAlertEsqlFromLlm,
  injectLookbackAfterFrom,
  rumAlertGroupingFieldsFromQuery,
  rumAlertTimeField,
  stripFinalWhere,
} from './rum_alert_esql';

describe('assertRumAlertEsql', () => {
  it('accepts a RUM logs query', () => {
    expect(
      assertRumAlertEsql(
        'FROM logs-*.otel-*\n| WHERE `event_name` == "exception"\n| STATS events = COUNT(*)\n| WHERE events >= 5'
      )
    ).toContain('FROM logs-*.otel-*');
  });

  it('rejects other index patterns', () => {
    expect(() => assertRumAlertEsql('FROM .kibana-event-log-*\n| LIMIT 1')).toThrow(
      /ux-rum-sessions-\*/
    );
  });

  it('accepts the session index', () => {
    expect(
      assertRumAlertEsql(
        'FROM ux-rum-sessions-2\n| STATS sessions = COUNT(*)\n| WHERE sessions < 5'
      )
    ).toContain('FROM ux-rum-sessions-*');
  });

  it('rejects ENRICH', () => {
    expect(() => assertRumAlertEsql('FROM logs-*.otel-*\n| ENRICH policy\n| LIMIT 1')).toThrow(
      /ENRICH/
    );
  });

  it('rewrites quoted, CCS, and METADATA FROM clauses', () => {
    expect(assertRumAlertEsql('FROM "logs-*.otel-*" METADATA _source\n| LIMIT 1')).toContain(
      'FROM logs-*.otel-*'
    );
    expect(assertRumAlertEsql('FROM *:logs-*.otel-*\n| LIMIT 1')).toContain('FROM logs-*.otel-*');
    expect(assertRumAlertEsql('FROM logs-*\n| LIMIT 1')).toContain('FROM logs-*.otel-*');
    expect(assertRumAlertEsql('FROM logs-*-otel-*\n| LIMIT 1')).toContain('FROM logs-*.otel-*');
  });

  it('keeps | commands that the model put on the FROM line', () => {
    const query = assertRumAlertEsql(
      'FROM logs-*.otel-* | EVAL day_of_week = DATE_EXTRACT("DAY_OF_WEEK", @timestamp) | WHERE day_of_week == 2 | STATS error_count = COUNT(*) BY `attributes.exception.type`, `attributes.exception.message`, page = COALESCE(`attributes.page.url.path`, `attributes.url.full`) | WHERE error_count > 10'
    );
    expect(query.split('\n')[0]).toBe('FROM logs-*.otel-*');
    expect(query).toContain('STATS error_count');
    expect(query).toContain('| WHERE error_count > 10');
    expect(query).not.toMatch(/day_of_week|DATE_EXTRACT/i);
  });
});

describe('extractRumAlertEsqlFromLlm', () => {
  it('reads JSON', () => {
    const extracted = extractRumAlertEsqlFromLlm(
      'Here\n{"query":"FROM logs-*.otel-*\\n| LIMIT 1","description":"test"}'
    );
    expect(extracted.query).toContain('FROM logs-*.otel-*');
    expect(extracted.description).toBe('test');
  });

  it('reads a fenced block', () => {
    const extracted = extractRumAlertEsqlFromLlm('```esql\nFROM logs-*.otel-*\n| LIMIT 1\n```');
    expect(extracted.query).toContain('FROM logs-*.otel-*');
  });
});

describe('stripFinalWhere', () => {
  it('drops the threshold line for charting', () => {
    expect(
      stripFinalWhere('FROM logs-*.otel-*\n| STATS events = COUNT(*)\n| WHERE events >= 5')
    ).toBe('FROM logs-*.otel-*\n| STATS events = COUNT(*)');
  });
});

describe('injectLookbackAfterFrom', () => {
  it('inserts a NOW() window after FROM', () => {
    const next = injectLookbackAfterFrom('FROM logs-*.otel-*\n| STATS events = COUNT(*)', '15m');
    expect(next).toContain('FROM logs-*.otel-*');
    expect(next).toContain('NOW() - 15 minutes');
    expect(next).toContain('STATS events');
    expect(next).toContain('@timestamp');
  });

  it('uses start_time and the watermark on the session index', () => {
    const next = injectLookbackAfterFrom(
      'FROM ux-rum-sessions-*\n| STATS sessions = COUNT(*)',
      '15m',
      { watermark: '2026-08-15T10:00:00.000Z' }
    );
    expect(next).toContain('`start_time` >= NOW() - 15 minutes');
    expect(next).toContain('`start_time` <= "2026-08-15T10:00:00.000Z"');
  });
});

describe('esqlLookbackLiteral', () => {
  it('maps alerting durations to ES|QL', () => {
    expect(esqlLookbackLiteral('15m')).toBe('15 minutes');
    expect(esqlLookbackLiteral('7d')).toBe('7 days');
  });
});

describe('rumAlertGroupingFieldsFromQuery', () => {
  it('detects BY page', () => {
    expect(rumAlertGroupingFieldsFromQuery('STATS x = COUNT(*) BY page = 1')).toEqual(['page']);
    expect(rumAlertGroupingFieldsFromQuery('STATS x = COUNT(*)')).toEqual([]);
  });
});

describe('rumAlertTimeField', () => {
  it('uses start_time for local and CCS session-index FROM clauses', () => {
    expect(rumAlertTimeField('FROM ux-rum-sessions-*\n| LIMIT 1')).toBe('start_time');
    expect(rumAlertTimeField('FROM ccs:ux-rum-sessions-*\n| LIMIT 1')).toBe('start_time');
    expect(rumAlertTimeField('FROM logs-*.otel-*\n| LIMIT 1')).toBe('@timestamp');
  });
});
