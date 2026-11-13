/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { geoTileBounds, type GeoBounds } from '../../../common/geo_bounds';
import {
  SESSIONS_INDEX_PATTERN,
  type SessionLocationCluster,
  type SessionLocationsResponse,
} from '../../../common/sessions';
import { totalHitsOf } from '../../lib/helpers/values';
import {
  SESSION_LOCATION_FIELD,
  boundsFilter,
  listedFilter,
  searchFilter,
  sessionScopeFilters,
  type ListSessionsParams,
} from './list_sessions';

/** More tiles than a map view fits at its precision, so a view is never cut short. */
export const MAX_SESSION_CLUSTERS = 2000;
/** The deepest `geotile_grid` precision. */
const MAX_TILE_PRECISION = 29;
/**
 * Tiles this many zoom levels deeper than the map: a 512-pixel map tile splits into 8 × 8 tiles of
 * 64 pixels, so clusters merge when their bubbles would overlap, and split as the map zooms in.
 */
const PRECISION_OVER_ZOOM = 3;

export type SessionLocationsParams = Omit<
  ListSessionsParams,
  'sortField' | 'sortDirection' | 'page' | 'perPage'
> & {
  /** The map's zoom level, which sets how far apart sessions still cluster. */
  zoom: number;
  /** The area the map shows; the whole world when left out. */
  viewport?: GeoBounds;
};

export const tilePrecision = (zoom: number): number =>
  Math.max(0, Math.min(MAX_TILE_PRECISION, Math.floor(zoom) + PRECISION_OVER_ZOOM));

interface Bucket {
  key: string;
  doc_count: number;
  centroid: { location?: { lat: number; lon: number } };
  cities: { buckets: Array<{ key: string; doc_count: number }> };
  city_count: { value: number };
  countries: { buckets: Array<{ key: string; doc_count: number }> };
}

export interface SessionLocationsAggs {
  located: {
    doc_count: number;
    bounds: {
      bounds?: {
        top_left: { lat: number; lon: number };
        bottom_right: { lat: number; lon: number };
      };
    };
    center: { location?: { lat: number; lon: number } };
    viewport: { tiles: { buckets: Bucket[] } };
  };
}

/**
 * The matching sessions with a location, clustered into the tiles of the map view, with how many
 * match in all and the area they span, for the map's first view. The list's own map area filter
 * (`filters.bounds`) is left out: the map shows its view, wherever the list is narrowed to.
 */
export const buildSessionLocationsRequest = (params: SessionLocationsParams): SearchRequest => {
  const { viewport, zoom, filters } = params;
  const { bounds: _listBounds, ...otherFilters } = filters ?? {};
  const listed = listedFilter({ facets: params.facets, filters: otherFilters });
  return {
    index: SESSIONS_INDEX_PATTERN,
    ignore_unavailable: true,
    allow_no_indices: true,
    track_total_hits: true,
    size: 0,
    query: {
      bool: { filter: [...sessionScopeFilters(params), ...searchFilter(params.query), listed] },
    },
    aggs: {
      located: {
        filter: { exists: { field: SESSION_LOCATION_FIELD } },
        aggs: {
          bounds: { geo_bounds: { field: SESSION_LOCATION_FIELD } },
          center: { geo_centroid: { field: SESSION_LOCATION_FIELD } },
          viewport: {
            filter: viewport ? boundsFilter(viewport) : { match_all: {} },
            aggs: {
              tiles: {
                geotile_grid: {
                  field: SESSION_LOCATION_FIELD,
                  precision: tilePrecision(zoom),
                  size: MAX_SESSION_CLUSTERS,
                },
                aggs: {
                  centroid: { geo_centroid: { field: SESSION_LOCATION_FIELD } },
                  cities: { terms: { field: 'geo.city', size: 1 } },
                  city_count: { cardinality: { field: 'geo.city' } },
                  countries: { terms: { field: 'geo.country_iso', size: 1 } },
                },
              },
            },
          },
        },
      },
    },
  };
};

const toCluster = (bucket: Bucket): SessionLocationCluster[] => {
  const bounds = geoTileBounds(bucket.key);
  const location = bucket.centroid.location;
  if (!bounds || !location) {
    return [];
  }
  const [city] = bucket.cities.buckets;
  const [country] = bucket.countries.buckets;
  // A name only when every session of the cluster has it: otherwise it names part of them.
  const allFrom = (named: { doc_count: number } | undefined) =>
    named !== undefined && named.doc_count === bucket.doc_count;
  return [
    {
      key: bucket.key,
      location: { lat: location.lat, lon: location.lon },
      count: bucket.doc_count,
      bounds,
      city: allFrom(city) && bucket.city_count.value <= 1 ? city.key : null,
      countryIso: allFrom(country) ? country.key : null,
      cityCount: bucket.city_count.value,
    },
  ];
};

export const parseSessionLocationsResponse = (
  response: SearchResponse<unknown, SessionLocationsAggs>
): SessionLocationsResponse => {
  const located = response.aggregations?.located;
  const box = located?.bounds.bounds;
  const center = located?.center.location;
  return {
    clusters: (located?.viewport.tiles.buckets ?? []).flatMap(toCluster),
    total: totalHitsOf(response.hits.total),
    located: located?.doc_count ?? 0,
    bounds: box
      ? {
          west: box.top_left.lon,
          south: box.bottom_right.lat,
          east: box.bottom_right.lon,
          north: box.top_left.lat,
        }
      : null,
    center: center ? { lat: center.lat, lon: center.lon } : null,
  };
};

/** Clusters the matching sessions by location, as the given (current) user. */
export const getSessionLocations = async (
  client: ElasticsearchClient,
  params: SessionLocationsParams
): Promise<SessionLocationsResponse> => {
  const response = await client.search<unknown, SessionLocationsAggs>(
    buildSessionLocationsRequest(params)
  );
  return parseSessionLocationsResponse(response);
};
