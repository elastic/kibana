/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { criticalityLabel, formatDelta, isRecent, isUpBad, relativeTime } from './presentation';

const NOW = new Date('2026-07-17T14:45:00Z').getTime();
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

describe('presentation', () => {
  describe('relativeTime', () => {
    it('renders em dash for undefined', () => {
      expect(relativeTime(undefined, NOW)).toBe('—');
    });
    it('renders minutes / hours / days / months', () => {
      expect(relativeTime(NOW - 5 * MIN, NOW)).toBe('5 min ago');
      expect(relativeTime(NOW - 3 * HOUR, NOW)).toBe('3 h ago');
      expect(relativeTime(NOW - 4 * DAY, NOW)).toBe('4 d ago');
      expect(relativeTime(NOW - 90 * DAY, NOW)).toBe('3 mo ago');
    });
    it('clamps sub-minute to 1 min', () => {
      expect(relativeTime(NOW - 1000, NOW)).toBe('1 min ago');
    });
  });

  describe('isRecent', () => {
    it('detects within-window timestamps', () => {
      expect(isRecent(NOW - 10 * MIN, NOW, 30 * MIN)).toBe(true);
      expect(isRecent(NOW - 40 * MIN, NOW, 30 * MIN)).toBe(false);
      expect(isRecent(undefined, NOW, 30 * MIN)).toBe(false);
    });
  });

  describe('criticalityLabel', () => {
    it('maps criticality keys to labels', () => {
      expect(criticalityLabel('extreme_impact')).toBe('Extreme');
      expect(criticalityLabel('high_impact')).toBe('High');
      expect(criticalityLabel(undefined)).toBe('Unassigned');
    });
  });

  describe('formatDelta', () => {
    it('signs the value', () => {
      expect(formatDelta(4)).toBe('+4');
      expect(formatDelta(-2)).toBe('-2');
      expect(formatDelta(0)).toBe('0');
    });
  });

  describe('isUpBad', () => {
    it('is true only for up-bad', () => {
      expect(isUpBad('up-bad')).toBe(true);
      expect(isUpBad('up-good')).toBe(false);
      expect(isUpBad('neutral')).toBe(false);
    });
  });
});
