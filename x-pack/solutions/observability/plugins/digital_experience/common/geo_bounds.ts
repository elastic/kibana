/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A map area, in degrees. `west` is greater than `east` when the area crosses the antimeridian,
 * which Elasticsearch's bounding box queries take as is.
 */
export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** The longest `bounds` param: four coordinates with 4 decimals and their signs. */
export const GEO_BOUNDS_PARAM_MAX_LENGTH = 64;

/** About 11 m at the equator: enough for a map area, and short in a URL. */
const DECIMALS = 4;

const round = (value: number): number => Number(value.toFixed(DECIMALS));

/** The `bounds` param of a map area: `west,south,east,north`. */
export const formatGeoBounds = ({ west, south, east, north }: GeoBounds): string =>
  [west, south, east, north].map((value) => String(round(value))).join(',');

const isLon = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180;
const isLat = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90;

/** The map area of a `bounds` param, or null when it isn't a valid one. */
export const parseGeoBounds = (raw: string | null | undefined): GeoBounds | null => {
  if (!raw || raw.length > GEO_BOUNDS_PARAM_MAX_LENGTH) {
    return null;
  }
  const parts = raw.split(',');
  if (parts.length !== 4 || parts.some((part) => part.trim() === '')) {
    return null;
  }
  const [west, south, east, north] = parts.map(Number);
  return isLon(west) && isLon(east) && isLat(south) && isLat(north) && south < north
    ? { west, south, east, north }
    : null;
};

/** Longitude wrapped into [-180, 180], as a map that scrolls past the antimeridian reports it. */
export const wrapLongitude = (lon: number): number => {
  if (lon >= -180 && lon <= 180) {
    return lon;
  }
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && lon > 0 ? 180 : wrapped;
};

const WHOLE_WORLD_LATITUDE = 85.0511;

/**
 * The area of a map view whose edges may be past the antimeridian: the whole width when it shows
 * the world around, and latitudes kept to what Web Mercator shows.
 */
export const normalizeGeoBounds = ({ west, south, east, north }: GeoBounds): GeoBounds => {
  const clampLat = (lat: number) =>
    Math.max(-WHOLE_WORLD_LATITUDE, Math.min(WHOLE_WORLD_LATITUDE, lat));
  const wholeWidth = east - west >= 360;
  return {
    west: wholeWidth ? -180 : wrapLongitude(west),
    south: clampLat(south),
    east: wholeWidth ? 180 : wrapLongitude(east),
    north: clampLat(north),
  };
};

const tileLon = (x: number, tiles: number) => (x / tiles) * 360 - 180;
const tileLat = (y: number, tiles: number) => {
  const n = Math.PI - (2 * Math.PI * y) / tiles;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/** The area of a `geotile_grid` bucket, from its `zoom/x/y` key; null for another key. */
export const geoTileBounds = (key: string): GeoBounds | null => {
  const parts = key.split('/').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    return null;
  }
  const [zoom, x, y] = parts;
  const tiles = 2 ** zoom;
  if (x >= tiles || y >= tiles) {
    return null;
  }
  return {
    west: tileLon(x, tiles),
    south: tileLat(y + 1, tiles),
    east: tileLon(x + 1, tiles),
    north: tileLat(y, tiles),
  };
};
