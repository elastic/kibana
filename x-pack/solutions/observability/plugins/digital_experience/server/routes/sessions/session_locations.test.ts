/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SESSIONS_INDEX_PATTERN } from '../../../common/sessions';
import {
  MAX_SESSION_CLUSTERS,
  buildSessionLocationsRequest,
  getSessionLocations,
  parseSessionLocationsResponse,
  tilePrecision,
  type SessionLocationsAggs,
  type SessionLocationsParams,
} from './session_locations';

const baseParams: SessionLocationsParams = {
  serviceName: 'checkout-web',
  start: '2026-10-20T00:00:00.000Z',
  end: '2026-10-21T00:00:00.000Z',
  zoom: 2,
};

const bucket = (
  key: string,
  count: number,
  {
    cities = [['Amsterdam', count]],
    cityCount = cities.length,
    countries = [['NL', count]],
  }: {
    cities?: Array<[string, number]>;
    cityCount?: number;
    countries?: Array<[string, number]>;
  } = {}
) => ({
  key,
  doc_count: count,
  centroid: { location: { lat: 52.3676, lon: 4.9041 }, count },
  cities: { buckets: cities.map(([name, docCount]) => ({ key: name, doc_count: docCount })) },
  city_count: { value: cityCount },
  countries: { buckets: countries.map(([iso, docCount]) => ({ key: iso, doc_count: docCount })) },
});

const response = (
  buckets: Array<ReturnType<typeof bucket>>,
  { total = 10, located = 8 }: { total?: number; located?: number } = {}
) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: total, relation: 'eq' }, hits: [] },
    aggregations: {
      located: {
        doc_count: located,
        bounds: {
          bounds: {
            top_left: { lat: 59.3293, lon: -122.4194 },
            bottom_right: { lat: -33.8688, lon: 151.2093 },
          },
        },
        center: { location: { lat: 40.1, lon: -12.5 }, count: located },
        viewport: { tiles: { buckets } },
      },
    },
  } as unknown as SearchResponse<unknown, SessionLocationsAggs>);

describe('session locations', () => {
  describe('buildSessionLocationsRequest', () => {
    it('clusters the located sessions of the application into tiles finer than the map zoom', () => {
      const request = buildSessionLocationsRequest(baseParams);
      expect(request).toMatchObject({
        index: SESSIONS_INDEX_PATTERN,
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            filter: expect.arrayContaining([{ term: { 'service.name': 'checkout-web' } }]),
          },
        },
      });
      expect(request.aggs?.located).toMatchObject({
        filter: { exists: { field: 'geo.location' } },
        aggs: {
          bounds: { geo_bounds: { field: 'geo.location' } },
          center: { geo_centroid: { field: 'geo.location' } },
          viewport: {
            filter: { match_all: {} },
            aggs: {
              tiles: {
                geotile_grid: { field: 'geo.location', precision: 5, size: MAX_SESSION_CLUSTERS },
              },
            },
          },
        },
      });
    });

    it('only clusters the sessions in the map view', () => {
      const request = buildSessionLocationsRequest({
        ...baseParams,
        viewport: { west: 170, south: -10, east: -170, north: 10 },
      });
      expect(request.aggs?.located.aggs?.viewport.filter).toEqual({
        geo_bounding_box: {
          'geo.location': {
            top_left: { lat: 10, lon: 170 },
            bottom_right: { lat: -10, lon: -170 },
          },
        },
      });
    });

    it("applies the list's search, facets and filters, but not its own map area", () => {
      const request = buildSessionLocationsRequest({
        ...baseParams,
        query: 'cart',
        facets: { browsers: 'Chrome' },
        filters: {
          withJsErrors: true,
          bounds: { west: 0, south: 0, east: 10, north: 10 },
        },
      });
      const serialized = JSON.stringify(request.query);
      expect(serialized).toContain('"value":"*cart*"');
      expect(serialized).toContain('"user_agent.browser":"Chrome"');
      expect(serialized).toContain('"js_error_count":{"gte":1}');
      expect(serialized).not.toContain('geo_bounding_box');
    });

    it.each([
      [0, 3],
      [2.9, 5],
      [30, 29],
    ])('clusters at precision %d for zoom %d', (zoom, precision) => {
      expect(tilePrecision(zoom)).toBe(precision);
    });
  });

  describe('parseSessionLocationsResponse', () => {
    it('returns the clusters with their tile, the totals and the area of all sessions', () => {
      expect(parseSessionLocationsResponse(response([bucket('3/4/2', 6)]))).toEqual({
        clusters: [
          {
            key: '3/4/2',
            location: { lat: 52.3676, lon: 4.9041 },
            count: 6,
            bounds: {
              west: 0,
              south: expect.closeTo(40.9799, 4),
              east: 45,
              north: expect.closeTo(66.5133, 4),
            },
            city: 'Amsterdam',
            countryIso: 'NL',
            cityCount: 1,
          },
        ],
        total: 10,
        located: 8,
        bounds: { west: -122.4194, south: -33.8688, east: 151.2093, north: 59.3293 },
        center: { lat: 40.1, lon: -12.5 },
      });
    });

    it('names no city or country that only part of a cluster is from', () => {
      const [cluster] = parseSessionLocationsResponse(
        response([
          bucket('3/4/2', 6, {
            cities: [['Amsterdam', 4]],
            cityCount: 2,
            countries: [['NL', 4]],
          }),
        ])
      ).clusters;
      expect(cluster).toMatchObject({ city: null, countryIso: null, cityCount: 2 });
    });

    it('keeps the country of a cluster of cities from one country', () => {
      const [cluster] = parseSessionLocationsResponse(
        response([bucket('3/4/2', 6, { cities: [['Berlin', 4]], cityCount: 2 })])
      ).clusters;
      expect(cluster).toMatchObject({ city: null, countryIso: 'NL' });
    });

    it('handles a missing sessions index', () => {
      expect(
        parseSessionLocationsResponse({
          took: 0,
          timed_out: false,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        })
      ).toEqual({ clusters: [], total: 0, located: 0, bounds: null, center: null });
    });
  });

  it('searches the sessions as the given client', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    client.search.mockResolvedValue(response([]));
    await expect(getSessionLocations(client, baseParams)).resolves.toMatchObject({ total: 10 });
    expect(client.search).toHaveBeenCalledWith(buildSessionLocationsRequest(baseParams));
  });
});
