/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { toEsqlRequest } from '../../streams/esql';
import {
  METRIC_SERIES_RUNTIME_MAPPINGS,
  RULE_EVENTS_INDEX,
  buildRuleEventsSignalFilter,
  projectMetricSeriesColumns,
} from './rule_events_metric_series';

describe('projectMetricSeriesColumns', () => {
  it('projects flattened data leaves with the canonical FIELD_EXTRACT casts', () => {
    const request = toEsqlRequest(
      projectMetricSeriesColumns(esql.from([RULE_EVENTS_INDEX]).where`type == "signal"`)
    );

    expect(request.query).toContain(
      'EVAL metric_value = TO_LONG(FIELD_EXTRACT(data, "metric_value"))'
    );
    expect(request.query).toContain(
      'EVAL bucket = TO_DATETIME(TO_LONG(FIELD_EXTRACT(data, "bucket")))'
    );
    expect(request.query).not.toContain('data.bucket');
    expect(request.query).not.toContain('data.metric_value');
  });
});

describe('buildRuleEventsSignalFilter', () => {
  it('scopes to signal docs for a space and lookback', () => {
    expect(
      buildRuleEventsSignalFilter({
        spaceId: 'default',
        lookback: 'now-40m',
        ruleIds: ['rule-a', 'rule-b'],
      })
    ).toEqual([
      { term: { type: 'signal' } },
      { term: { space_id: 'default' } },
      { range: { '@timestamp': { gte: 'now-40m' } } },
      { terms: { 'rule.id': ['rule-a', 'rule-b'] } },
    ]);
  });
});

describe('METRIC_SERIES_RUNTIME_MAPPINGS', () => {
  it('reads flattened leaves from _source first (Alerting flattened access pattern)', () => {
    expect(METRIC_SERIES_RUNTIME_MAPPINGS['metric_series.bucket']?.type).toBe('date');
    expect(METRIC_SERIES_RUNTIME_MAPPINGS['metric_series.value']?.type).toBe('long');
    const bucketScript = METRIC_SERIES_RUNTIME_MAPPINGS['metric_series.bucket']?.script;
    const rawSource =
      typeof bucketScript === 'object' && bucketScript != null && 'source' in bucketScript
        ? bucketScript.source
        : undefined;
    expect(typeof rawSource).toBe('string');
    const bucketSource = rawSource as string;
    expect(bucketSource).toContain("params._source.data['bucket']");
    expect(bucketSource.indexOf('params._source')).toBeLessThan(
      bucketSource.indexOf("doc.containsKey('data.bucket')")
    );
    expect(bucketSource).toContain('Long.parseLong');
    expect(bucketSource).not.toContain('ZonedDateTime.parse');
  });
});
