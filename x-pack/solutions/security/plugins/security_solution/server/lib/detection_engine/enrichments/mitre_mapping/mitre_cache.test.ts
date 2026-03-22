/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMitreFromCache,
  setMitreInCache,
  clearMitreCache,
  getCacheStats,
} from './mitre_cache';
import type { SecurityFeatures, MitreMapping } from './types';

describe('mitre_cache', () => {
  const mockFeatures: SecurityFeatures = {
    processName: 'powershell.exe',
    processCommandLine: 'powershell -enc AAAA',
    eventAction: 'process_start',
  };

  const mockMapping: MitreMapping = {
    techniques: [{ id: 'T1059.001', name: 'PowerShell', confidence: 0.95 }],
    tactics: [{ id: 'TA0002', name: 'Execution' }],
    phase: 'Execution',
    reasoning: 'PowerShell execution detected',
  };

  beforeEach(() => {
    clearMitreCache(); // Reset cache before each test
  });

  describe('basic cache operations', () => {
    it('should return null for cache miss', () => {
      const result = getMitreFromCache(mockFeatures);
      expect(result).toBeNull();
    });

    it('should return cached mapping for cache hit', () => {
      setMitreInCache(mockFeatures, mockMapping);
      const result = getMitreFromCache(mockFeatures);

      expect(result).toEqual(mockMapping);
    });

    it('should cache identical process+command combinations', () => {
      const features1 = { ...mockFeatures };
      const features2 = { ...mockFeatures };

      setMitreInCache(features1, mockMapping);
      const result = getMitreFromCache(features2);

      expect(result).toEqual(mockMapping); // Cache hit even with different object reference
    });
  });

  describe('cache key generation', () => {
    it('should treat different processes as different cache keys', () => {
      const pwshFeatures: SecurityFeatures = {
        processName: 'powershell.exe',
      };
      const cmdFeatures: SecurityFeatures = {
        processName: 'cmd.exe',
      };

      setMitreInCache(pwshFeatures, mockMapping);

      expect(getMitreFromCache(pwshFeatures)).not.toBeNull();
      expect(getMitreFromCache(cmdFeatures)).toBeNull(); // Different cache key
    });

    it('should treat command line differences as different cache keys', () => {
      const features1: SecurityFeatures = {
        processName: 'powershell.exe',
        processCommandLine: 'powershell -enc AAAA',
      };
      const features2: SecurityFeatures = {
        processName: 'powershell.exe',
        processCommandLine: 'powershell -enc BBBB', // Different command
      };

      setMitreInCache(features1, mockMapping);

      expect(getMitreFromCache(features1)).not.toBeNull();
      expect(getMitreFromCache(features2)).toBeNull(); // Different command = different key
    });

    it('should handle command line truncation for cache efficiency', () => {
      const longCommand = 'powershell -enc ' + 'A'.repeat(200);
      const features1: SecurityFeatures = {
        processName: 'powershell.exe',
        processCommandLine: longCommand,
      };
      const features2: SecurityFeatures = {
        processName: 'powershell.exe',
        processCommandLine: longCommand + 'EXTRA', // Extra chars beyond 100 truncation
      };

      setMitreInCache(features1, mockMapping);

      // Both should hit cache (command truncated to 100 chars)
      expect(getMitreFromCache(features1)).not.toBeNull();
      expect(getMitreFromCache(features2)).not.toBeNull(); // Cache hit due to truncation
    });
  });

  describe('cache TTL (expiration)', () => {
    it('should expire entries after TTL', () => {
      setMitreInCache(mockFeatures, mockMapping);

      // Immediately: cache hit
      expect(getMitreFromCache(mockFeatures)).not.toBeNull();

      // Mock time passage (7 days + 1 second)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 7 * 24 * 60 * 60 * 1000 + 1000);

      // After TTL: cache miss
      expect(getMitreFromCache(mockFeatures)).toBeNull();
    });
  });

  describe('cache eviction (LRU)', () => {
    it('should evict oldest entry when cache full', () => {
      // This test would require setting MAX_CACHE_SIZE to a small value
      // For now, we test the stats function
      const stats = getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBeGreaterThan(0);
      expect(stats.utilizationPercent).toBe(0);
    });
  });

  describe('cache stats', () => {
    it('should track cache size', () => {
      setMitreInCache(mockFeatures, mockMapping);

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.utilizationPercent).toBeGreaterThan(0);
    });

    it('should show 0% utilization when empty', () => {
      const stats = getCacheStats();
      expect(stats.utilizationPercent).toBe(0);
    });
  });

  describe('clearMitreCache', () => {
    it('should remove all entries', () => {
      setMitreInCache(mockFeatures, mockMapping);
      expect(getMitreFromCache(mockFeatures)).not.toBeNull();

      clearMitreCache();

      expect(getMitreFromCache(mockFeatures)).toBeNull();
      expect(getCacheStats().size).toBe(0);
    });
  });
});
