/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_DAILY_SPEC, RUM_PAGES_DAILY_SPEC } from '../../common/rum_daily';
import {
  RUM_CANONICAL_SERVICE_NAME_FIELD,
  RUM_CANONICAL_SESSION_ID_FIELD,
  RUM_CANONICAL_URL_PATH_GROUPED_FIELD,
} from '../../common/rum_sessions';
import { PAGE_PATH_SCRIPT } from '../routes/rum/query';
import {
  buildRumPagesDailyTransformBody,
  buildRumServiceDailyTransformBody,
  rumBrowserDailyTransformBody,
  rumDailyDestPipeline,
  rumPagesDailyTransformBody,
  rumServiceDailyTransformBody,
} from './rum_daily_spec';

describe('rum daily transform specs', () => {
  it('groups pages by day, service, and the raw page-path script', () => {
    const { group_by: groupBy } = rumPagesDailyTransformBody.pivot;
    expect(groupBy['@timestamp']).toEqual({
      date_histogram: { field: '@timestamp', calendar_interval: '1d', missing_bucket: true },
    });
    expect(groupBy['service.name']).toEqual({
      terms: { field: RUM_CANONICAL_SERVICE_NAME_FIELD },
    });
    expect(groupBy['url.path.grouped']).toEqual({
      terms: {
        script: { source: PAGE_PATH_SCRIPT, lang: 'painless' },
        missing_bucket: true,
      },
    });
  });

  it('groups service daily by day and service only', () => {
    const { group_by: groupBy } = rumServiceDailyTransformBody.pivot;
    expect(groupBy['@timestamp']).toEqual({
      date_histogram: { field: '@timestamp', calendar_interval: '1d', missing_bucket: true },
    });
    expect(groupBy['service.name']).toEqual({
      terms: { field: RUM_CANONICAL_SERVICE_NAME_FIELD },
    });
    expect(groupBy).not.toHaveProperty('url.path.grouped');
  });

  it('defaults sync delay to 5m and accepts an override', () => {
    expect(rumPagesDailyTransformBody.sync.time.delay).toBe('5m');
    expect(rumServiceDailyTransformBody.sync.time.delay).toBe('5m');
    expect(buildRumPagesDailyTransformBody('1m').sync.time.delay).toBe('1m');
    expect(buildRumServiceDailyTransformBody('30s').sync.time.delay).toBe('30s');
  });

  it('requires a session id and uses hourly checkpoints', () => {
    const filters = rumPagesDailyTransformBody.source.query.bool.filter;
    expect(filters).toEqual(
      expect.arrayContaining([{ exists: { field: RUM_CANONICAL_SESSION_ID_FIELD } }])
    );
    expect(filters).not.toContainEqual({
      exists: { field: RUM_CANONICAL_URL_PATH_GROUPED_FIELD },
    });
    expect(filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bool: expect.objectContaining({ minimum_should_match: 1 }),
        }),
      ])
    );
    expect(rumPagesDailyTransformBody.frequency).toBe('1h');
    expect(rumServiceDailyTransformBody.frequency).toBe('1h');
  });

  it('flattens percentile and filter maps in the dest pipeline', () => {
    const source = rumDailyDestPipeline.processors[0].script.source;
    expect(source).toContain("values['75.0']");
    expect(source).toContain("v['75']");
    expect(source).toContain('inner instanceof Number');
    expect(source).toContain('ctx.inp_p75 = p75Of(ctx.inp_p75)');
    expect(source).toContain('ctx.page_views = countOf');
    expect(source).toContain('ctx.load_p75');
    expect(source).toContain('ctx.lcp_samples = samplesOf(ctx.lcp)');
    expect(source).toContain('ctx.lcp_good = countOf(ctx.lcp.good)');
    expect(source).toContain('ctx.lcp_element = topKey(ctx.lcp.element)');
    expect(source).toContain('v.entrySet()');
    expect(source).toContain('ctx.load_samples = samplesOf(load)');
  });

  it('stores good / NI / poor counts on each vital', () => {
    const lcp = rumPagesDailyTransformBody.pivot.aggregations.lcp;
    expect(lcp.aggs).toEqual(
      expect.objectContaining({
        good: { filter: { range: { 'attributes.browser.web_vital.value': { lte: 2500 } } } },
        ni: {
          filter: { range: { 'attributes.browser.web_vital.value': { gt: 2500, lte: 4000 } } },
        },
        poor: { filter: { range: { 'attributes.browser.web_vital.value': { gt: 4000 } } } },
      })
    );
    expect(rumPagesDailyTransformBody._meta).toEqual(
      expect.objectContaining({ spec: RUM_PAGES_DAILY_SPEC })
    );
    expect(rumServiceDailyTransformBody._meta).toEqual(
      expect.objectContaining({ spec: RUM_DAILY_SPEC })
    );
    expect(lcp.aggs.element).toEqual(
      expect.objectContaining({
        terms: expect.objectContaining({
          field: 'attributes.browser.web_vital.lcp.element',
          size: 1,
        }),
      })
    );
  });

  it('groups browser daily by day, service, and browser name', () => {
    const { group_by: groupBy } = rumBrowserDailyTransformBody.pivot;
    expect(groupBy['browser.name']).toEqual({
      terms: { field: 'attributes.browser.name' },
    });
    expect(groupBy).not.toHaveProperty('url.path.grouped');
  });

  it('counts load samples as a sub-agg because filter dest docs drop doc_count', () => {
    const load = rumPagesDailyTransformBody.pivot.aggregations.load;
    expect(load).toEqual(
      expect.objectContaining({
        aggs: expect.objectContaining({
          samples: { value_count: { field: '@timestamp' } },
        }),
      })
    );
  });
});
