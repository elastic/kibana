/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatusTimeBins, getStatusEffectiveValue } from './monitor_status_data';

describe('createStatusTimeBins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default values when `heatmapData` is `undefined`', () => {
    const timeBuckets = [
      { start: 1000, end: 2000 },
      { start: 2000, end: 3000 },
    ];

    const result = createStatusTimeBins(timeBuckets, undefined);

    expect(result).toEqual([
      { start: 1000, end: 2000, ups: 0, downs: 0, value: 0 },
      { start: 2000, end: 3000, ups: 0, downs: 0, value: 0 },
    ]);
  });

  it('should calculate `ups` and `downs` correctly from `heatmapData`', () => {
    const timeBuckets = [
      { start: 1000, end: 2000 },
      { start: 2000, end: 3000 },
    ];

    const heatmapData = [
      { key: 1500, key_as_string: '1500', up: { value: 1 }, down: { value: 2 }, doc_count: 3 },
      { key: 2500, key_as_string: '2500', up: { value: 3 }, down: { value: 1 }, doc_count: 4 },
    ];

    const result = createStatusTimeBins(timeBuckets, heatmapData);

    expect(result).toEqual([
      { start: 1000, end: 2000, ups: 1, downs: 2, value: getStatusEffectiveValue(1, 2) },
      { start: 2000, end: 3000, ups: 3, downs: 1, value: getStatusEffectiveValue(3, 1) },
    ]);
  });

  it('should return value 0 when ups + downs is 0', () => {
    const timeBuckets = [
      { start: 1000, end: 2000 },
      { start: 2000, end: 3000 },
    ];

    const heatmapData = [
      { key: 1500, key_as_string: '1500', up: { value: 0 }, down: { value: 0 }, doc_count: 0 },
      { key: 2500, key_as_string: '2500', up: { value: 0 }, down: { value: 0 }, doc_count: 0 },
    ];

    const result = createStatusTimeBins(timeBuckets, heatmapData);

    expect(result).toEqual([
      { start: 1000, end: 2000, ups: 0, downs: 0, value: 0 },
      { start: 2000, end: 3000, ups: 0, downs: 0, value: 0 },
    ]);
  });

  it('should filter heatmapData correctly based on start and end values', () => {
    const timeBuckets = [
      { start: 1000, end: 2000 },
      { start: 2000, end: 3000 },
    ];

    const heatmapData = [
      { key: 500, key_as_string: '500', doc_count: 2, up: { value: 1 }, down: { value: 1 } },
      { key: 1500, key_as_string: '1500', doc_count: 5, up: { value: 2 }, down: { value: 3 } },
      { key: 2500, key_as_string: '2500', doc_count: 9, up: { value: 4 }, down: { value: 5 } },
      { key: 3500, key_as_string: '3500', doc_count: 1, up: { value: 6 }, down: { value: 7 } },
    ];

    const result = createStatusTimeBins(timeBuckets, heatmapData);

    expect(result).toEqual([
      { start: 1000, end: 2000, ups: 2, downs: 3, value: getStatusEffectiveValue(2, 3) },
      { start: 2000, end: 3000, ups: 4, downs: 5, value: getStatusEffectiveValue(4, 5) },
    ]);
  });

  it('should not include ES bucket that starts at the end boundary of a time bucket', () => {
    const timeBuckets = [
      { start: 1000, end: 2000 },
      { start: 2000, end: 3000 },
    ];

    const heatmapData = [
      { key: 1000, key_as_string: '1000', doc_count: 1, up: { value: 1 }, down: { value: 0 } },
      { key: 2000, key_as_string: '2000', doc_count: 1, up: { value: 1 }, down: { value: 0 } },
    ];

    const result = createStatusTimeBins(timeBuckets, heatmapData);

    expect(result).toEqual([
      { start: 1000, end: 2000, ups: 1, downs: 0, value: getStatusEffectiveValue(1, 0) },
      { start: 2000, end: 3000, ups: 1, downs: 0, value: getStatusEffectiveValue(1, 0) },
    ]);
  });
});
