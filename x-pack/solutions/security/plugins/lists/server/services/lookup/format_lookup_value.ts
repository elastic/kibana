/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isGeoPointObject = (value: unknown): value is { lat: unknown; lon: unknown } =>
  typeof value === 'object' &&
  value != null &&
  'lat' in value &&
  'lon' in value &&
  (value as { lat: unknown }).lat != null &&
  (value as { lon: unknown }).lon != null;

/**
 * The authored spelling of a stored lookup `value`. Every type stores a scalar except
 * `geo_point` written as `lat,lon`, which the shared serializer stores as an object; the
 * shared stream renders it back as `lat,lon` on read, and so does this.
 */
export const formatLookupValue = (value: unknown): string =>
  isGeoPointObject(value) ? `${String(value.lat)},${String(value.lon)}` : String(value);
