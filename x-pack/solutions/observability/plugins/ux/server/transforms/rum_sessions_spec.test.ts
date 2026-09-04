/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_SESSION_GROUP_FIELD } from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import {
  buildRumSessionsTransformBody,
  rumNormalizePipeline,
  rumSessionsDestPipeline,
  rumSessionsIndexTemplate,
  rumSessionsTransformBody,
} from './rum_sessions_spec';

describe('rumSessionsTransformBody', () => {
  it('groups by rotated attributes.session.id instead of Painless scripts', () => {
    const { group_by: groupBy } = rumSessionsTransformBody.pivot;
    expect(groupBy['session.id']).toEqual({
      terms: { field: RUM_SESSION_GROUP_FIELD },
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
    expect(aggregations.fcp.aggs.p75).toBeDefined();
    expect(aggregations.ttfb.aggs.p75).toBeDefined();
    expect(aggregations).not.toHaveProperty('sequences');
    expect(JSON.stringify(aggregations)).not.toContain('scripted_metric');
    expect(aggregations.pages.aggs.token.top_metrics.size).toBe(10);
    expect(aggregations.page_last.aggs.token.top_metrics.size).toBe(1);
    expect(aggregations.clicks.aggs.token.top_metrics.metrics.field).toBe(
      'attributes.browser.css_selector'
    );
    expect(aggregations.last_seen.top_metrics.size).toBe(1);
    expect(aggregations.last_seen.top_metrics.metrics).toHaveLength(10);
    expect(aggregations.last_seen.top_metrics.metrics).toEqual(
      expect.arrayContaining([
        { field: 'attributes.client.geo.country_iso_code' },
        { field: 'resource.attributes.client.geo.country_iso_code' },
      ])
    );
    expect(aggregations.user_seen.filter.bool.should).toEqual(
      expect.arrayContaining([
        { exists: { field: 'attributes.user.email' } },
        { exists: { field: 'resource.attributes.user.email' } },
        { exists: { field: 'attributes.user.id' } },
        { exists: { field: 'resource.attributes.user.id' } },
      ])
    );
    expect(aggregations.user_seen.aggs.token.top_metrics.metrics).toEqual(
      expect.arrayContaining([
        { field: 'attributes.user.email' },
        { field: 'resource.attributes.user.email' },
      ])
    );
    expect(rumSessionsTransformBody._meta).toEqual(expect.objectContaining({ spec: 10 }));
    expect(aggregations.last_seen.top_metrics.metrics).toEqual(
      expect.arrayContaining([{ field: 'attributes.url.path.grouped' }])
    );
  });

  it('defaults sync delay to 5m and accepts an override', () => {
    expect(rumSessionsTransformBody.sync.time.delay).toBe('5m');
    expect(buildRumSessionsTransformBody('1m').sync.time.delay).toBe('1m');
  });

  it('keeps 90d of session history for long-range analytics', () => {
    expect(rumSessionsTransformBody.source.query.bool.filter[0]).toEqual({
      range: { '@timestamp': { gte: 'now-90d/d' } },
    });
    expect(rumSessionsTransformBody.source.query.bool.filter[1]).toEqual({
      exists: { field: RUM_SESSION_GROUP_FIELD },
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

  it('builds sequences from native top_metrics, not scripted_metric', () => {
    const { aggregations } = rumSessionsTransformBody.pivot;
    expect(aggregations.pages.filter).toEqual({
      bool: {
        filter: [
          expect.objectContaining({
            bool: expect.objectContaining({ minimum_should_match: 1 }),
          }),
          { exists: { field: 'attributes.url.path.grouped' } },
        ],
      },
    });
    expect(aggregations.clicks.filter).toEqual({
      bool: {
        filter: [
          expect.objectContaining({
            bool: expect.objectContaining({ minimum_should_match: 1 }),
          }),
          { exists: { field: 'attributes.browser.css_selector' } },
        ],
      },
    });
    expect(aggregations.pages.aggs.token.top_metrics.sort).toEqual({
      '@timestamp': 'asc',
    });
    expect(aggregations.page_last.aggs.token.top_metrics.sort).toEqual({ '@timestamp': 'desc' });
    expect(aggregations.last_seen.top_metrics.sort).toEqual({ '@timestamp': 'desc' });
    expect(aggregations.rage_clicks.filter).toBeDefined();
    expect(aggregations.dead_clicks.filter).toBeDefined();
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
    expect(source).toContain('ctx.page_count = countOf(ctx.page_view_count)');
    expect(source).not.toContain('ctx.page_count = pageTokens.size()');
    expect(source).toContain('pageTokens.length == 0');
    expect(source).toContain("fieldOf(last, 'attributes.url.path.grouped')");
    expect(source).toContain('firstIdentity');
    expect(source).toContain('ctx.user_seen');
    expect(source).toContain('ctx.user.key');
    expect(source).toContain('resource.attributes.client.geo.country_iso_code');
    expect(source).toContain('tokensFrom');
    expect(source).toContain('token.top');
    expect(source).toContain('if (top instanceof List && top.length > 0)');
    expect(source).toContain('ctx.pages');
    expect(source).toContain('ctx.page_first');
    expect(source).toContain('ctx.replay_event_count');
    expect(source).toContain('ctx.fcp_p75');
    expect(source).toContain('ctx.ttfb_p75');
    expect(source).not.toContain('ctx.sequences');
  });
});

describe('rumSessionsIndexTemplate', () => {
  it('sorts dest by start_time desc then session.id', () => {
    expect(rumSessionsIndexTemplate.template.settings).toEqual({
      'index.default_pipeline': 'ux-rum-sessions-dest',
      'index.sort.field': ['start_time', 'session.id'],
      'index.sort.order': ['desc', 'asc'],
    });
  });
});

describe('rumNormalizePipeline', () => {
  it('only stamps missing fields', () => {
    const source = rumNormalizePipeline.processors[0].script.source;
    expect(source).toContain("r['session.id'] == null");
    expect(source).toContain("a['user.key'] == null");
    expect(source).toContain("r['user.email']");
    expect(source).toContain("r['user.name']");
    expect(source).toContain("a['rum.has_replay'] == null");
    expect(source).toContain("a['screen.name']");
    expect(source).toContain("r['rum.platform'] == null");
    expect(source).toContain("ev == 'app.crash'");
    expect(source).not.toContain('ctx.remove');
  });
});
