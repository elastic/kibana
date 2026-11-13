/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import type { SessionLocationCluster } from '../../../../common/sessions';
import {
  CLUSTER_COUNT_PROPERTY,
  SELECTED_LAYER_ID,
  clusterFeatures,
  clusterOfFeature,
  clustersLayerId,
  isClustersLayer,
  clusterTitle,
  clusterZoom,
  fitView,
  sessionsMapLayers,
  viewBounds,
} from './sessions_map';

const cluster = (overrides: Partial<SessionLocationCluster> = {}): SessionLocationCluster => ({
  key: '5/16/10',
  location: { lat: 52.3676, lon: 4.9041 },
  count: 12,
  bounds: { west: 0, south: 48.9, east: 11.25, north: 55.77 },
  city: 'Amsterdam',
  countryIso: 'NL',
  cityCount: 1,
  ...overrides,
});

const colors = { fill: '#0B64DD', border: '#FFFFFF', label: '#FFFFFF', selected: '#BC1E70' };

describe('sessions map utils', () => {
  describe('viewBounds', () => {
    it('gives the area a view shows at its size', () => {
      // At zoom 1 the world is 1,024 pixels wide: 512 pixels are half of it.
      const bounds = viewBounds({ lat: 0, lon: 0, zoom: 1 }, { width: 512, height: 512 });
      expect(bounds.west).toBeCloseTo(-90);
      expect(bounds.east).toBeCloseTo(90);
      expect(bounds.north).toBeCloseTo(66.5133, 3);
      expect(bounds.south).toBeCloseTo(-66.5133, 3);
    });

    it('wraps a view that crosses the antimeridian', () => {
      const bounds = viewBounds({ lat: 0, lon: 180, zoom: 2 }, { width: 512, height: 256 });
      expect(bounds.west).toBeCloseTo(135);
      expect(bounds.east).toBeCloseTo(-135);
    });

    it('takes the whole world when the view is wider than it', () => {
      const bounds = viewBounds({ lat: 0, lon: 0, zoom: 0 }, { width: 2000, height: 400 });
      expect(bounds.west).toBe(-180);
      expect(bounds.east).toBe(180);
    });
  });

  describe('fitView', () => {
    it('centers on an area and zooms as far as it fits', () => {
      const view = fitView(
        { west: -10, south: 35, east: 30, north: 60 },
        { width: 600, height: 600 }
      );
      expect(view.lon).toBeCloseTo(10);
      expect(view.zoom).toBeGreaterThan(2);
      expect(view.zoom).toBeLessThan(4);
      // The fitted view shows all of the area.
      const shown = viewBounds(view, { width: 600, height: 600 });
      expect(shown.west).toBeLessThanOrEqual(-10);
      expect(shown.east).toBeGreaterThanOrEqual(30);
      expect(shown.south).toBeLessThanOrEqual(35);
      expect(shown.north).toBeGreaterThanOrEqual(60);
    });

    it('shows a single place at city level', () => {
      const view = fitView(
        { west: 4.9, south: 52.37, east: 4.9, north: 52.37 },
        { width: 400, height: 800 }
      );
      expect(view.lat).toBeCloseTo(52.37, 2);
      expect(view.lon).toBeCloseTo(4.9, 2);
      expect(view.zoom).toBe(9);
    });

    it('centers a narrow map that cannot show all of the area on where the sessions are', () => {
      const area = { west: -122.4, south: -33.9, east: 151.2, north: 59.3 };
      const center = { lat: 40.1, lon: -12.5 };
      // 400 × 800: the world fills the height at zoom 0.64, and is then wider than the map.
      expect(fitView(area, { width: 400, height: 800 }, center)).toEqual({
        lat: 40.1,
        lon: -12.5,
        zoom: 0.7,
      });
      // A map wide enough shows all of it, around its middle.
      expect(fitView(area, { width: 1200, height: 600 }, center).lon).toBeCloseTo(14.4, 1);
    });

    it('fits an area across the antimeridian through it', () => {
      const view = fitView(
        { west: 170, south: -20, east: -170, north: 0 },
        { width: 600, height: 600 }
      );
      expect(Math.abs(view.lon)).toBeCloseTo(180);
      expect(view.zoom).toBeGreaterThan(3);
    });
  });

  it('loads clusters for whole zoom levels', () => {
    expect(clusterZoom(3.7)).toBe(3);
    expect(clusterZoom(-1)).toBe(0);
  });

  describe('clusterFeatures and clusterOfFeature', () => {
    it('turns each cluster into a point that carries it', () => {
      const { features } = clusterFeatures([cluster()]);
      expect(features).toHaveLength(1);
      expect(features[0]).toMatchObject({
        id: '5/16/10',
        geometry: { type: 'Point', coordinates: [4.9041, 52.3676] },
        properties: { [CLUSTER_COUNT_PROPERTY]: 12 },
      });
      // The tooltip reads the cluster back from the bubble the user points at.
      expect(clusterOfFeature(features[0].properties)).toEqual(cluster());
    });

    it('reads back a cluster without a city or country', () => {
      const mixed = cluster({ city: null, countryIso: null, cityCount: 3 });
      expect(clusterOfFeature(clusterFeatures([mixed]).features[0].properties)).toEqual(mixed);
    });

    it('has no cluster for a feature of another layer', () => {
      expect(clusterOfFeature({})).toBeNull();
      expect(clusterOfFeature(undefined)).toBeNull();
    });
  });

  describe('sessionsMapLayers', () => {
    const idsOf = (layers: LayerDescriptor[]) => layers.map(({ id }) => id);

    it('draws the clusters over the basemap, and rings the open session', () => {
      const basemap = { id: 'basemap', type: 'EMS_VECTOR_TILE' } as LayerDescriptor;
      const layers = sessionsMapLayers({
        basemap,
        clusters: [cluster()],
        loadId: '1',
        selectedLocation: { lat: 52.3676, lon: 4.9041 },
        colors,
      });
      expect(idsOf(layers)).toEqual(['basemap', clustersLayerId('1'), SELECTED_LAYER_ID]);
    });

    it('draws no basemap without one, and no ring without a location', () => {
      const layers = sessionsMapLayers({
        basemap: null,
        clusters: [],
        loadId: '1',
        selectedLocation: null,
        colors,
      });
      expect(idsOf(layers)).toEqual([clustersLayerId('1')]);
    });

    it('gives the clusters a new layer for each load, as the Maps plugin keeps the features it drew', () => {
      const layerOf = (loadId: string) =>
        sessionsMapLayers({
          basemap: null,
          clusters: [],
          loadId,
          selectedLocation: null,
          colors,
        })[0];
      expect(layerOf('1').id).not.toBe(layerOf('2').id);
      expect(isClustersLayer(layerOf('2').id)).toBe(true);
      expect(isClustersLayer(SELECTED_LAYER_ID)).toBe(false);
    });

    it('sizes and labels the clusters by their count', () => {
      const [layer] = sessionsMapLayers({
        basemap: null,
        clusters: [cluster()],
        loadId: '1',
        selectedLocation: null,
        colors,
      });
      expect(layer.sourceDescriptor).toMatchObject({
        type: 'GEOJSON_FILE',
        __featureCollection: clusterFeatures([cluster()]),
      });
      expect(layer.style).toMatchObject({
        properties: {
          iconSize: { type: 'DYNAMIC', options: { field: { name: CLUSTER_COUNT_PROPERTY } } },
          labelText: { type: 'DYNAMIC', options: { field: { name: CLUSTER_COUNT_PROPERTY } } },
          fillColor: { type: 'STATIC', options: { color: colors.fill } },
        },
      });
    });
  });

  describe('clusterTitle', () => {
    it('names the city when all its sessions are from it', () => {
      expect(clusterTitle(cluster())).toBe('Amsterdam, NL');
      expect(clusterTitle(cluster({ countryIso: null }))).toBe('Amsterdam');
    });

    it('counts the cities, in their country when they share one', () => {
      expect(clusterTitle(cluster({ city: null, cityCount: 2 }))).toBe('2 cities in NL');
      expect(clusterTitle(cluster({ city: null, countryIso: null, cityCount: 3 }))).toBe(
        '3 cities'
      );
    });
  });
});
