/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertMetricValue } from './convert_metric_value';

describe('convertMetricValue', () => {
  describe('cpu metrics', () => {
    it('should convert cpu percentage from 0-100 to 0-1 scale', () => {
      expect(convertMetricValue('cpu', 50)).toBe(0.5);
      expect(convertMetricValue('cpu', 100)).toBe(1);
      expect(convertMetricValue('cpu', 0)).toBe(0);
    });

    it('should convert cpuV2 percentage from 0-100 to 0-1 scale', () => {
      expect(convertMetricValue('cpuV2', 50)).toBe(0.5);
      expect(convertMetricValue('cpuV2', 100)).toBe(1);
      expect(convertMetricValue('cpuV2', 0)).toBe(0);
    });
  });

  describe('memory metrics', () => {
    it('should convert memory percentage from 0-100 to 0-1 scale', () => {
      expect(convertMetricValue('memory', 75)).toBe(0.75);
      expect(convertMetricValue('memory', 100)).toBe(1);
      expect(convertMetricValue('memory', 0)).toBe(0);
    });
  });

  describe('network metrics (bits to bytes)', () => {
    it('should convert tx threshold from bits to bytes', () => {
      expect(convertMetricValue('tx', 8)).toBe(1);
    });

    it('should convert rx threshold from bits to bytes', () => {
      expect(convertMetricValue('rx', 8)).toBe(1);
      expect(convertMetricValue('rx', 800)).toBe(100);
    });

    it('should convert txV2 threshold from bits to bytes', () => {
      expect(convertMetricValue('txV2', 8)).toBe(1);
      expect(convertMetricValue('txV2', 800)).toBe(100);
      expect(convertMetricValue('txV2', 450000)).toBe(56250);
    });

    it('should convert rxV2 threshold from bits to bytes', () => {
      expect(convertMetricValue('rxV2', 8)).toBe(1);
      expect(convertMetricValue('rxV2', 800)).toBe(100);
      expect(convertMetricValue('rxV2', 450000)).toBe(56250);
    });
  });

  describe('metrics without conversion', () => {
    it('should return the value unchanged for metrics without converters', () => {
      expect(convertMetricValue('diskIOReadBytes', 1000)).toBe(1000);
      expect(convertMetricValue('diskIOWriteBytes', 2000)).toBe(2000);
      expect(convertMetricValue('logRate', 500)).toBe(500);
    });
  });
});
