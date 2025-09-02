/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryQueryConfiguration, TelemetryConfiguration } from './types';

describe('Telemetry Types', () => {
  describe('TelemetryQueryConfiguration', () => {
    it('should accept all optional properties', () => {
      const config: TelemetryQueryConfiguration = {
        pageSize: 1000,
        maxResponseSize: 5000000,
        maxCompressedResponseSize: 1000000,
      };

      expect(config.pageSize).toBe(1000);
      expect(config.maxResponseSize).toBe(5000000);
      expect(config.maxCompressedResponseSize).toBe(1000000);
    });

    it('should accept empty configuration', () => {
      const config: TelemetryQueryConfiguration = {};

      expect(config.pageSize).toBeUndefined();
      expect(config.maxResponseSize).toBeUndefined();
      expect(config.maxCompressedResponseSize).toBeUndefined();
    });

    it('should accept partial configuration', () => {
      const config: TelemetryQueryConfiguration = {
        pageSize: 500,
      };

      expect(config.pageSize).toBe(500);
      expect(config.maxResponseSize).toBeUndefined();
      expect(config.maxCompressedResponseSize).toBeUndefined();
    });

    it('should accept only pageSize', () => {
      const config: TelemetryQueryConfiguration = {
        pageSize: 250,
      };

      expect(config).toEqual({ pageSize: 250 });
    });

    it('should accept only maxResponseSize', () => {
      const config: TelemetryQueryConfiguration = {
        maxResponseSize: 2500000,
      };

      expect(config).toEqual({ maxResponseSize: 2500000 });
    });

    it('should accept only maxCompressedResponseSize', () => {
      const config: TelemetryQueryConfiguration = {
        maxCompressedResponseSize: 500000,
      };

      expect(config).toEqual({ maxCompressedResponseSize: 500000 });
    });
  });

  describe('TelemetryConfiguration with query_config', () => {
    it('should accept TelemetryConfiguration without query_config', () => {
      const config: TelemetryConfiguration = {
        telemetry_max_buffer_size: 100,
        max_security_list_telemetry_batch: 100,
        max_endpoint_telemetry_batch: 300,
        max_detection_rule_telemetry_batch: 1000,
        max_detection_alerts_batch: 50,
        use_async_sender: false,
      };

      expect(config.query_config).toBeUndefined();
    });

    it('should accept TelemetryConfiguration with query_config', () => {
      const timelineConfig: TelemetryQueryConfiguration = {
        pageSize: 1000,
        maxResponseSize: 5000000,
      };

      const config: TelemetryConfiguration = {
        telemetry_max_buffer_size: 100,
        max_security_list_telemetry_batch: 100,
        max_endpoint_telemetry_batch: 300,
        max_detection_rule_telemetry_batch: 1000,
        max_detection_alerts_batch: 50,
        use_async_sender: false,
        query_config: timelineConfig,
      };

      expect(config.query_config).toEqual(timelineConfig);
      expect(config.query_config?.pageSize).toBe(1000);
      expect(config.query_config?.maxResponseSize).toBe(5000000);
    });

    it('should accept TelemetryConfiguration with empty query_config', () => {
      const config: TelemetryConfiguration = {
        telemetry_max_buffer_size: 100,
        max_security_list_telemetry_batch: 100,
        max_endpoint_telemetry_batch: 300,
        max_detection_rule_telemetry_batch: 1000,
        max_detection_alerts_batch: 50,
        use_async_sender: false,
        query_config: {},
      };

      expect(config.query_config).toEqual({});
    });

    it('should maintain compatibility with existing configurations', () => {
      // This tests that adding query_config doesn't break existing configurations
      const legacyConfig: Omit<TelemetryConfiguration, 'query_config'> = {
        telemetry_max_buffer_size: 100,
        max_security_list_telemetry_batch: 100,
        max_endpoint_telemetry_batch: 300,
        max_detection_rule_telemetry_batch: 1000,
        max_detection_alerts_batch: 50,
        use_async_sender: false,
      };

      const modernConfig: TelemetryConfiguration = {
        ...legacyConfig,
        query_config: {
          pageSize: 750,
        },
      };

      expect(modernConfig.telemetry_max_buffer_size).toBe(legacyConfig.telemetry_max_buffer_size);
      expect(modernConfig.query_config?.pageSize).toBe(750);
    });
  });
});
