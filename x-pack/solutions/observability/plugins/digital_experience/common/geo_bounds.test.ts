/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatGeoBounds,
  geoTileBounds,
  normalizeGeoBounds,
  parseGeoBounds,
  wrapLongitude,
} from './geo_bounds';

describe('geo bounds', () => {
  describe('formatGeoBounds and parseGeoBounds', () => {
    it('writes west,south,east,north with 4 decimals, and reads it back', () => {
      const param = formatGeoBounds({
        west: -74.0060123,
        south: 40.7,
        east: 13.40512,
        north: 52.5200049,
      });
      expect(param).toBe('-74.006,40.7,13.4051,52.52');
      expect(parseGeoBounds(param)).toEqual({
        west: -74.006,
        south: 40.7,
        east: 13.4051,
        north: 52.52,
      });
    });

    it('reads an area across the antimeridian, with west past east', () => {
      expect(parseGeoBounds('170,-10,-170,10')).toEqual({
        west: 170,
        south: -10,
        east: -170,
        north: 10,
      });
    });

    it.each([
      ['missing', undefined],
      ['empty', ''],
      ['three values', '1,2,3'],
      ['an empty value', '1,,3,4'],
      ['not numbers', 'a,b,c,d'],
      ['a longitude out of range', '-181,0,10,10'],
      ['a latitude out of range', '0,-91,10,10'],
      ['south not below north', '0,10,10,10'],
      ['too long', `${'1'.repeat(60)},0,1,1`],
    ])('rejects %s', (_, raw) => {
      expect(parseGeoBounds(raw)).toBeNull();
    });
  });

  describe('wrapLongitude', () => {
    it.each([
      [0, 0],
      [180, 180],
      [-180, -180],
      [190, -170],
      [-190, 170],
      [540, 180],
      [360, 0],
    ])('wraps %d into %d', (lon, wrapped) => {
      expect(wrapLongitude(lon)).toBeCloseTo(wrapped);
    });
  });

  describe('normalizeGeoBounds', () => {
    it('takes the whole width of a view that shows the world around', () => {
      expect(normalizeGeoBounds({ west: -300, south: -89, east: 300, north: 89 })).toEqual({
        west: -180,
        south: -85.0511,
        east: 180,
        north: 85.0511,
      });
    });

    it('wraps a view past the antimeridian, so west is past east', () => {
      expect(normalizeGeoBounds({ west: 170, south: 0, east: 200, north: 10 })).toEqual({
        west: 170,
        south: 0,
        east: -160,
        north: 10,
      });
    });
  });

  describe('geoTileBounds', () => {
    it('gives the area of a geotile key', () => {
      const world = geoTileBounds('0/0/0');
      expect(world?.west).toBe(-180);
      expect(world?.east).toBe(180);
      expect(world?.south).toBeCloseTo(-85.0511, 4);
      expect(world?.north).toBeCloseTo(85.0511, 4);
      const tile = geoTileBounds('3/3/2');
      expect(tile?.west).toBe(-45);
      expect(tile?.east).toBe(0);
      expect(tile?.south).toBeCloseTo(40.9799, 4);
      expect(tile?.north).toBeCloseTo(66.5133, 4);
    });

    it.each(['', '1/2', 'a/b/c', '1/2/0', '1/0/-1', '1.5/0/0'])('rejects the key %p', (key) => {
      expect(geoTileBounds(key)).toBeNull();
    });
  });
});
