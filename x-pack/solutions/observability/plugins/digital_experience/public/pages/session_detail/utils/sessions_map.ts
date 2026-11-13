/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureCollection } from 'geojson';
import { i18n } from '@kbn/i18n';
import type { LayerDescriptor, VectorLayerDescriptor } from '@kbn/maps-plugin/common';
import {
  FIELD_ORIGIN,
  LABEL_BORDER_SIZES,
  LABEL_POSITIONS,
  LAYER_STYLE_TYPE,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
} from '@kbn/maps-plugin/common';
import { normalizeGeoBounds, type GeoBounds } from '../../../../common/geo_bounds';
import type { GeoLocation, SessionLocationCluster } from '../../../../common/sessions';

/** Where and how close the map looks, as the Maps embeddable keeps it. */
export interface MapView {
  lat: number;
  lon: number;
  zoom: number;
}

export interface MapSize {
  width: number;
  height: number;
}

/** MapLibre's tile size: a map `zoom` levels deep is `512 × 2^zoom` pixels wide. */
const TILE_SIZE = 512;
/** Zoom of a map fit to sessions from one place: a city with room around it. */
const SINGLE_PLACE_ZOOM = 9;
const MAX_FIT_ZOOM = 12;
/** Room left around the sessions when the map fits them, in pixels. */
const FIT_PADDING = 32;
const MAX_MERCATOR_LAT = 85.0511;

export const WORLD_VIEW: MapView = { lat: 20, lon: 0, zoom: 0 };

const clampLat = (lat: number) => Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));

/** Web Mercator position of a point in a world 1 wide and 1 tall. */
const projectX = (lon: number) => (lon + 180) / 360;
const projectY = (lat: number) => {
  const sin = Math.sin((clampLat(lat) * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
};
const unprojectLon = (x: number) => x * 360 - 180;
const unprojectLat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

/**
 * The area a map view shows, at its size: the Maps embeddable publishes its center and zoom, not
 * its edges. Longitudes are wrapped, and a view that shows the world around takes all of it.
 */
export const viewBounds = ({ lat, lon, zoom }: MapView, { width, height }: MapSize): GeoBounds => {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const x = projectX(lon);
  const y = projectY(lat);
  const halfWidth = width / 2 / worldSize;
  const halfHeight = height / 2 / worldSize;
  return normalizeGeoBounds({
    west: unprojectLon(x - halfWidth),
    east: unprojectLon(x + halfWidth),
    north: unprojectLat(Math.max(0, y - halfHeight)),
    south: unprojectLat(Math.min(1, y + halfHeight)),
  });
};

/**
 * The view that shows all of `bounds` at the map's size, but no closer than a city. A map fills its
 * height with the world first, so a tall, narrow one can't zoom out far enough to show areas wide
 * apart: it then centers on `center`, where most of the sessions are, rather than on the middle of
 * the area, which may have none.
 */
export const fitView = (
  bounds: GeoBounds,
  { width, height }: MapSize,
  center?: GeoLocation | null
): MapView => {
  // An area across the antimeridian goes on past 180.
  const east = bounds.east < bounds.west ? bounds.east + 360 : bounds.east;
  const west = bounds.west;
  const spanX = projectX(east) - projectX(west);
  const spanY = projectY(bounds.south) - projectY(bounds.north);
  const centerX = (projectX(west) + projectX(east)) / 2;
  const centerY = (projectY(bounds.north) + projectY(bounds.south)) / 2;
  const middle = { lat: unprojectLat(centerY), lon: unprojectLon(centerX) };
  const room = (pixels: number) => Math.max(1, pixels - 2 * FIT_PADDING) / TILE_SIZE;
  const zoomFor = (span: number, pixels: number) =>
    span > 0 ? Math.log2(room(pixels) / span) : Infinity;
  const zoom = Math.min(zoomFor(spanX, width), zoomFor(spanY, height));
  const minZoom = Math.log2(height / TILE_SIZE);
  if (center && zoom < minZoom) {
    return { lat: center.lat, lon: center.lon, zoom: Math.ceil(Math.max(0, minZoom) * 10) / 10 };
  }
  return {
    lat: middle.lat,
    lon: middle.lon > 180 ? middle.lon - 360 : middle.lon,
    zoom: Number.isFinite(zoom)
      ? Math.max(0, Math.min(MAX_FIT_ZOOM, Math.floor(zoom * 10) / 10))
      : SINGLE_PLACE_ZOOM,
  };
};

/** The map zoom whose clusters the server builds: whole levels, so small zooms don't refetch. */
export const clusterZoom = (zoom: number): number => Math.max(0, Math.floor(zoom));

export const CLUSTER_KEY_PROPERTY = 'cluster_key';
export const CLUSTER_COUNT_PROPERTY = 'session_count';

/** The clusters as points, with their key, to find them back in a tooltip, and their size. */
export const clusterFeatures = (clusters: SessionLocationCluster[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: clusters.map(({ key, location, count }) => ({
    type: 'Feature',
    id: key,
    geometry: { type: 'Point', coordinates: [location.lon, location.lat] },
    properties: { [CLUSTER_KEY_PROPERTY]: key, [CLUSTER_COUNT_PROPERTY]: count },
  })),
});

export const CLUSTERS_LAYER_ID = 'digitalExperienceSessionClusters';
export const SELECTED_LAYER_ID = 'digitalExperienceSelectedSession';

export interface ClusterLayerColors {
  fill: string;
  border: string;
  label: string;
  selected: string;
}

const CLUSTERS_LAYER_NAME = i18n.translate('xpack.digitalExperience.sessionsMap.clustersLayer', {
  defaultMessage: 'Sessions',
});

const SELECTED_LAYER_NAME = i18n.translate('xpack.digitalExperience.sessionsMap.selectedLayer', {
  defaultMessage: 'This session',
});

const pointLayer = ({
  id,
  name,
  featureCollection,
  fields,
  style,
  disableTooltips,
}: {
  id: string;
  name: string;
  featureCollection: FeatureCollection;
  fields: Array<{ name: string; type: 'string' | 'number' }>;
  style: VectorLayerDescriptor['style'];
  disableTooltips: boolean;
}): VectorLayerDescriptor => ({
  id,
  type: LAYER_TYPE.GEOJSON_VECTOR,
  label: name,
  visible: true,
  alpha: 1,
  minZoom: 0,
  maxZoom: 24,
  joins: [],
  disableTooltips,
  sourceDescriptor: {
    id,
    type: SOURCE_TYPES.GEOJSON_FILE,
    __featureCollection: featureCollection,
    __fields: fields,
    areResultsTrimmed: false,
    tooltipContent: null,
    name,
  },
  style,
});

const staticColor = (color: string): { type: STYLE_TYPE.STATIC; options: { color: string } } => ({
  type: STYLE_TYPE.STATIC,
  options: { color },
});
const staticSize = (size: number): { type: STYLE_TYPE.STATIC; options: { size: number } } => ({
  type: STYLE_TYPE.STATIC,
  options: { size },
});
const countField = { name: CLUSTER_COUNT_PROPERTY, origin: FIELD_ORIGIN.SOURCE };

/**
 * The clusters as bubbles that grow with their sessions and show how many they hold, the way the
 * Maps app draws its own clusters.
 */
export const clustersLayer = (
  clusters: SessionLocationCluster[],
  colors: ClusterLayerColors
): VectorLayerDescriptor =>
  pointLayer({
    id: CLUSTERS_LAYER_ID,
    name: CLUSTERS_LAYER_NAME,
    featureCollection: clusterFeatures(clusters),
    fields: [
      { name: CLUSTER_KEY_PROPERTY, type: 'string' },
      { name: CLUSTER_COUNT_PROPERTY, type: 'number' },
    ],
    disableTooltips: false,
    style: {
      type: LAYER_STYLE_TYPE.VECTOR,
      isTimeAware: false,
      properties: {
        symbolizeAs: { options: { value: SYMBOLIZE_AS_TYPES.CIRCLE } },
        icon: { type: STYLE_TYPE.STATIC, options: { value: 'marker' } },
        fillColor: staticColor(colors.fill),
        lineColor: staticColor(colors.border),
        lineWidth: staticSize(2),
        iconSize: {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            minSize: 10,
            maxSize: 26,
            field: countField,
            fieldMetaOptions: { isEnabled: true, sigma: 3 },
          },
        },
        iconOrientation: { type: STYLE_TYPE.STATIC, options: { orientation: 0 } },
        labelText: {
          type: STYLE_TYPE.DYNAMIC,
          options: { field: countField },
        },
        labelPosition: { options: { position: LABEL_POSITIONS.CENTER } },
        labelZoomRange: { options: { useLayerZoomRange: true, minZoom: 0, maxZoom: 24 } },
        labelColor: staticColor(colors.label),
        labelSize: staticSize(12),
        labelBorderColor: staticColor(colors.fill),
        labelBorderSize: { options: { size: LABEL_BORDER_SIZES.NONE } },
      },
    },
  });

/** Where the open session is from, ringed apart from the clusters. */
export const selectedSessionLayer = (
  location: GeoLocation,
  colors: ClusterLayerColors
): VectorLayerDescriptor =>
  pointLayer({
    id: SELECTED_LAYER_ID,
    name: SELECTED_LAYER_NAME,
    featureCollection: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [location.lon, location.lat] },
          properties: {},
        },
      ],
    },
    fields: [],
    disableTooltips: true,
    style: {
      type: LAYER_STYLE_TYPE.VECTOR,
      isTimeAware: false,
      properties: {
        symbolizeAs: { options: { value: SYMBOLIZE_AS_TYPES.CIRCLE } },
        icon: { type: STYLE_TYPE.STATIC, options: { value: 'marker' } },
        fillColor: staticColor('rgba(0,0,0,0)'),
        lineColor: staticColor(colors.selected),
        lineWidth: staticSize(3),
        iconSize: staticSize(18),
        iconOrientation: { type: STYLE_TYPE.STATIC, options: { orientation: 0 } },
        labelText: { type: STYLE_TYPE.STATIC, options: { value: '' } },
        labelPosition: { options: { position: LABEL_POSITIONS.CENTER } },
        labelZoomRange: { options: { useLayerZoomRange: true, minZoom: 0, maxZoom: 24 } },
        labelColor: staticColor(colors.label),
        labelSize: staticSize(12),
        labelBorderColor: staticColor(colors.border),
        labelBorderSize: { options: { size: LABEL_BORDER_SIZES.NONE } },
      },
    },
  });

/** The basemap, if the deployment has one, under the sessions. */
export const sessionsMapLayers = ({
  basemap,
  clusters,
  selectedLocation,
  colors,
}: {
  basemap: LayerDescriptor | null;
  clusters: SessionLocationCluster[];
  selectedLocation: GeoLocation | null;
  colors: ClusterLayerColors;
}): LayerDescriptor[] => [
  ...(basemap ? [basemap] : []),
  clustersLayer(clusters, colors),
  ...(selectedLocation ? [selectedSessionLayer(selectedLocation, colors)] : []),
];

/**
 * What a cluster's sessions have in common, as the list describes a location: their city, else
 * their country, else how many cities they're from.
 */
export const clusterTitle = ({ city, countryIso, cityCount }: SessionLocationCluster): string => {
  if (city) {
    return countryIso ? `${city}, ${countryIso}` : city;
  }
  if (countryIso) {
    return i18n.translate('xpack.digitalExperience.sessionsMap.clusterCountry', {
      defaultMessage: '{count, plural, one {# city} other {# cities}} in {country}',
      values: { count: cityCount, country: countryIso },
    });
  }
  return i18n.translate('xpack.digitalExperience.sessionsMap.clusterCities', {
    defaultMessage: '{count, plural, one {# city} other {# cities}}',
    values: { count: cityCount },
  });
};
