/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { decode } from '@kbn/rison';
import { getExploreButtonInfo } from './get_explore_url';

const BASE_URL = '/app/securitySolutionUI/alerts';

const createHit = (
  flattened: Record<string, unknown> = {},
  id: string = 'test-id',
  index: string = 'test-index'
): DataTableRecord =>
  ({
    id,
    raw: { _id: id, _index: index },
    flattened: { _id: id, _index: index, ...flattened },
    isAnchor: false,
  } as DataTableRecord);

const parseTimelineParams = (url: string) => {
  const params = new URLSearchParams(url.split('?')[1]);
  return {
    timeline: decode(params.get('timeline')!) as {
      activeTab: string;
      isOpen: boolean;
      query: { kind: string; expression: string };
    },
    timerange: decode(params.get('timerange')!) as Record<string, unknown>,
    timelineFlyout: decode(params.get('timelineFlyout')!) as {
      right: { id: string; params: { id: string; indexName: string; scopeId: string } };
    },
  };
};

describe('getExploreButtonInfo', () => {
  describe('label', () => {
    it('returns "Explore in Alerts" for an alert document (event.kind === signal)', () => {
      const { label } = getExploreButtonInfo(createHit({ 'event.kind': 'signal' }), BASE_URL);
      expect(label).toBe('Explore in Alerts');
    });

    it('returns "Explore in Alerts" for an alert document that also has kibana.alert.url', () => {
      const { label } = getExploreButtonInfo(
        createHit({ 'event.kind': 'signal', 'kibana.alert.url': 'https://kibana.example.com' }),
        BASE_URL
      );
      expect(label).toBe('Explore in Alerts');
    });

    it('returns "Explore in Timeline" for a non-alert document (event.kind === event)', () => {
      const { label } = getExploreButtonInfo(createHit({ 'event.kind': 'event' }), BASE_URL);
      expect(label).toBe('Explore in Timeline');
    });

    it('returns "Explore in Timeline" when event.kind is not set', () => {
      const { label } = getExploreButtonInfo(createHit(), BASE_URL);
      expect(label).toBe('Explore in Timeline');
    });
  });

  describe('url', () => {
    it('returns kibana.alert.url directly when present, regardless of event.kind', () => {
      const alertUrl = 'https://kibana.example.com/app/security/alerts/redirect/abc123';
      const { url } = getExploreButtonInfo(
        createHit({ 'event.kind': 'signal', 'kibana.alert.url': alertUrl }),
        BASE_URL
      );
      expect(url).toBe(alertUrl);
    });

    it('builds a timeline URL prefixed with the provided base URL', () => {
      const { url } = getExploreButtonInfo(createHit({ 'event.kind': 'event' }), BASE_URL);
      expect(url).toMatch(new RegExp(`^${BASE_URL}\\?`));
    });

    it('encodes the event id in the timeline query expression', () => {
      const { url } = getExploreButtonInfo(createHit({}, 'my-event-id'), BASE_URL);
      const { timeline } = parseTimelineParams(url);
      expect(timeline.query.expression).toBe('_id: my-event-id');
    });

    it('opens the timeline panel with the correct params', () => {
      const { url } = getExploreButtonInfo(createHit({}, 'my-event-id'), BASE_URL);
      const { timeline } = parseTimelineParams(url);
      expect(timeline.activeTab).toBe('query');
      expect(timeline.isOpen).toBe(true);
    });

    it('encodes the index name in the timeline flyout params', () => {
      const { url } = getExploreButtonInfo(createHit({}, 'test-id', 'my-index'), BASE_URL);
      const { timelineFlyout } = parseTimelineParams(url);
      expect(timelineFlyout.right.params.indexName).toBe('my-index');
      expect(timelineFlyout.right.params.id).toBe('test-id');
      expect(timelineFlyout.right.params.scopeId).toBe('timeline-1');
    });

    it('includes a timerange when @timestamp is present', () => {
      const timestamp = '2024-01-01T00:00:00.000Z';
      const { url } = getExploreButtonInfo(createHit({ '@timestamp': timestamp }), BASE_URL);
      const { timerange } = parseTimelineParams(url);
      const tr = (timerange as { timeline: { timerange: { from: string; to: string } } }).timeline
        .timerange;
      expect(tr.from).toBe(timestamp);
      expect(tr.to).toBe(timestamp);
    });

    it('omits the timerange when @timestamp is absent', () => {
      const { url } = getExploreButtonInfo(createHit({ 'event.kind': 'event' }), BASE_URL);
      const { timerange } = parseTimelineParams(url);
      expect(timerange).toEqual({});
    });
  });
});
