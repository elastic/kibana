/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsEventSource } from '../../types';
import { getDefaultEventSource, hasOnlySampleSources } from './event_source_utils';
import { EVENT_SOURCE, SAMPLE_EVENT_SOURCE } from './test_helpers';

const CLICKSTREAM_SAMPLE_SOURCE: AnalyticsEventSource = {
  ...SAMPLE_EVENT_SOURCE,
  name: 'kibana_sample_data_clickstream',
  documentsCount: 8_628,
};
const SMALL_OWN_SOURCE: AnalyticsEventSource = { ...EVENT_SOURCE, name: 'my-events' };

describe('getDefaultEventSource', () => {
  it('has no default without sources', () => {
    expect(getDefaultEventSource([])).toBeUndefined();
  });

  it('prefers the largest own source over larger sample sources', () => {
    expect(
      getDefaultEventSource([
        SAMPLE_EVENT_SOURCE,
        CLICKSTREAM_SAMPLE_SOURCE,
        EVENT_SOURCE,
        SMALL_OWN_SOURCE,
      ])
    ).toBe(EVENT_SOURCE);
  });

  it('prefers the clickstream sample events among sample sources', () => {
    expect(getDefaultEventSource([SAMPLE_EVENT_SOURCE, CLICKSTREAM_SAMPLE_SOURCE])).toBe(
      CLICKSTREAM_SAMPLE_SOURCE
    );
  });

  it('falls back to the largest sample source', () => {
    expect(
      getDefaultEventSource([
        SAMPLE_EVENT_SOURCE,
        { ...SAMPLE_EVENT_SOURCE, name: 'kibana_sample_data_ecommerce' },
      ])
    ).toBe(SAMPLE_EVENT_SOURCE);
  });
});

describe('hasOnlySampleSources', () => {
  it('is true when every source in the cluster is sample data', () => {
    expect(
      hasOnlySampleSources({
        sources: [SAMPLE_EVENT_SOURCE, CLICKSTREAM_SAMPLE_SOURCE],
        totalSources: 2,
      })
    ).toBe(true);
  });

  it('is false with a source of the user, with unlisted sources, or with none', () => {
    expect(
      hasOnlySampleSources({ sources: [SAMPLE_EVENT_SOURCE, EVENT_SOURCE], totalSources: 2 })
    ).toBe(false);
    expect(hasOnlySampleSources({ sources: [SAMPLE_EVENT_SOURCE], totalSources: 2 })).toBe(false);
    expect(hasOnlySampleSources({ sources: [], totalSources: 0 })).toBe(false);
  });
});
