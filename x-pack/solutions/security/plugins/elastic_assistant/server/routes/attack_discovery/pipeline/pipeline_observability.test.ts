/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOrCreateMetricsCollector, getPipelineConfig } from './pipeline_observability';
import { DEFAULT_PIPELINE_CONFIG } from '../../../lib/attack_discovery/pipeline/types';

describe('pipeline_observability helpers', () => {
  describe('getOrCreateMetricsCollector', () => {
    it('returns the same collector for the same space', () => {
      const a = getOrCreateMetricsCollector('space-a');
      const b = getOrCreateMetricsCollector('space-a');
      expect(a).toBe(b);
    });

    it('returns different collectors for different spaces', () => {
      const a = getOrCreateMetricsCollector('space-x');
      const b = getOrCreateMetricsCollector('space-y');
      expect(a).not.toBe(b);
    });
  });

  describe('getPipelineConfig', () => {
    it('returns default config for unknown space', () => {
      const config = getPipelineConfig(`unknown-space-${Date.now()}`);
      expect(config).toEqual(DEFAULT_PIPELINE_CONFIG);
    });

    it('returns fully merged config with defaults', () => {
      const config = getPipelineConfig(`no-overrides-${Date.now()}`);
      expect(config.deduplication.similarityThreshold).toBe(0.85);
      expect(config.caseMatching.strategy).toBe('weighted');
      expect(config.incrementalAd.minNewAlerts).toBe(2);
    });
  });
});
