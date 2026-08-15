/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_CANONICAL_SESSION_ID_FIELD } from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import {
  buildRumSessionsTransformBody,
  rumNormalizePipeline,
  rumSessionsDestPipeline,
  rumSessionsTransformBody,
} from './rum_sessions_spec';

describe('rumSessionsTransformBody', () => {
  it('groups by canonical keyword fields instead of Painless scripts', () => {
    const { group_by: groupBy } = rumSessionsTransformBody.pivot;
    expect(groupBy['session.id']).toEqual({
      terms: { field: RUM_CANONICAL_SESSION_ID_FIELD },
    });
    expect(groupBy).not.toHaveProperty('service.name');
  });

  it('stores page views, connection, device, error groups, and session vitals', () => {
    const { aggregations } = rumSessionsTransformBody.pivot;
    expect(aggregations.page_view_count).toEqual({
      filter: expect.objectContaining({
        bool: expect.objectContaining({ minimum_should_match: 1 }),
      }),
    });
    expect(aggregations.error_groups.aggs.groups.terms.size).toBe(5);
    expect(aggregations.lcp.aggs.p75).toBeDefined();
    expect(aggregations.sequences.scripted_metric.init_script).toContain('state.connection');
    expect(rumSessionsTransformBody._meta).toEqual(expect.objectContaining({ spec: 2 }));
  });

  it('defaults sync delay to 5m and accepts an override', () => {
    expect(rumSessionsTransformBody.sync.time.delay).toBe('5m');
    expect(buildRumSessionsTransformBody('1m').sync.time.delay).toBe('1m');
  });

  it('keeps 90d of session history for long-range analytics', () => {
    expect(rumSessionsTransformBody.source.query.bool.filter[0]).toEqual({
      range: { '@timestamp': { gte: 'now-90d/d' } },
    });
    expect(rumSessionsTransformBody.retention_policy.time.max_age).toBe('93d');
  });

  it('accepts a longer session lookback', () => {
    const body = buildRumSessionsTransformBody('5m', 180);
    expect(body.source.query.bool.filter[0]).toEqual({
      range: { '@timestamp': { gte: 'now-180d/d' } },
    });
    expect(body.retention_policy.time.max_age).toBe('183d');
  });

  it('reads sequence fields from doc values and caps per-shard state', () => {
    const mapScript =
      rumSessionsTransformBody.pivot.aggregations.sequences.scripted_metric.map_script;
    expect(mapScript).toContain("doc['@timestamp'].value.millis");
    expect(mapScript).toContain('attributes.url.path.grouped');
    expect(mapScript).toContain('doc.containsKey(field)');
    expect(mapScript).toContain('state.pages.length < 40');
    expect(mapScript).not.toContain('params._source');
    expect(mapScript).not.toContain('def src =');
  });

  it('reads has_replay from RUM attributes and does not scan replay streams', () => {
    expect(rumSessionsTransformBody.source.index).toEqual([RUM_SESSION_SOURCE_INDEX]);
    expect(rumSessionsTransformBody.pivot.aggregations.has_replay).toEqual({
      filter: { term: { 'attributes.rum.has_replay': true } },
    });
    expect(rumSessionsTransformBody.pivot.aggregations).not.toHaveProperty('replay_event_count');
  });
});

describe('rumSessionsDestPipeline', () => {
  it('coerces numeric has_replay filter counts to boolean', () => {
    const source = rumSessionsDestPipeline.processors[0].script.source;
    expect(source).toContain('ctx.has_replay instanceof Number');
    expect(source).toContain('boolean replay = false');
    expect(source).toContain('ctx.duration_ms');
    expect(source).toContain('ctx.page_view_count');
    expect(source).toContain('ctx.connection = seq.connection');
  });
});

describe('rumNormalizePipeline', () => {
  it('only stamps missing fields', () => {
    const source = rumNormalizePipeline.processors[0].script.source;
    expect(source).toContain("r['session.id'] == null");
    expect(source).toContain("a['user.key'] == null");
    expect(source).toContain("a['rum.has_replay'] == null");
    expect(source).not.toContain('ctx.remove');
  });
});
