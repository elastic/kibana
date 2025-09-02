/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { telemetryConfiguration } from './configuration';
import type { TelemetryQueryConfiguration } from './types';

describe('TelemetryConfiguration', () => {
  beforeEach(() => {
    telemetryConfiguration.resetAllToDefault();
  });

  describe('query_config', () => {
    it('should have proper default configuration', () => {
      const expectedDefaults = {
        pageSize: 500,
        maxResponseSize: 10 * 1024 * 1024, // 10 MB
        maxCompressedResponseSize: 8 * 1024 * 1024, // 8 MB
      };
      expect(telemetryConfiguration.query_config).toEqual(expectedDefaults);
    });

    it('should allow setting pageSize', () => {
      const config: TelemetryQueryConfiguration = {
        pageSize: 1000,
      };

      telemetryConfiguration.query_config = config;
      expect(telemetryConfiguration.query_config.pageSize).toBe(1000);
    });

    it('should allow setting maxResponseSize', () => {
      const config: TelemetryQueryConfiguration = {
        maxResponseSize: 5000000,
      };

      telemetryConfiguration.query_config = config;
      expect(telemetryConfiguration.query_config.maxResponseSize).toBe(5000000);
    });

    it('should allow setting maxCompressedResponseSize', () => {
      const config: TelemetryQueryConfiguration = {
        maxCompressedResponseSize: 1000000,
      };

      telemetryConfiguration.query_config = config;
      expect(telemetryConfiguration.query_config.maxCompressedResponseSize).toBe(1000000);
    });

    it('should allow setting all timeline configuration properties', () => {
      const config: TelemetryQueryConfiguration = {
        pageSize: 500,
        maxResponseSize: 2500000,
        maxCompressedResponseSize: 500000,
      };

      telemetryConfiguration.query_config = config;
      expect(telemetryConfiguration.query_config).toEqual(config);
    });

    it('should allow setting partial configuration', () => {
      const config: TelemetryQueryConfiguration = {
        pageSize: 750,
      };

      telemetryConfiguration.query_config = config;
      expect(telemetryConfiguration.query_config.pageSize).toBe(750);
      expect(telemetryConfiguration.query_config.maxResponseSize).toBeUndefined();
      expect(telemetryConfiguration.query_config.maxCompressedResponseSize).toBeUndefined();
    });

    it('should reset to default configuration when resetAllToDefault is called', () => {
      const config: TelemetryQueryConfiguration = {
        pageSize: 1000,
        maxResponseSize: 5000000,
        maxCompressedResponseSize: 1000000,
      };

      const expectedDefaults = {
        pageSize: 500,
        maxResponseSize: 10 * 1024 * 1024, // 10 MB
        maxCompressedResponseSize: 8 * 1024 * 1024, // 8 MB
      };

      telemetryConfiguration.query_config = config;
      expect(telemetryConfiguration.query_config).toEqual(config);

      telemetryConfiguration.resetAllToDefault();
      expect(telemetryConfiguration.query_config).toEqual(expectedDefaults);
    });

    it('should handle empty configuration object', () => {
      const config: TelemetryQueryConfiguration = {};

      telemetryConfiguration.query_config = config;
      expect(telemetryConfiguration.query_config).toEqual({});
    });
  });

  describe('integration with other configurations', () => {
    it('should not affect other configuration settings when timeline config is set', () => {
      const originalBufferSize = telemetryConfiguration.telemetry_max_buffer_size;
      const originalEndpointBatch = telemetryConfiguration.max_endpoint_telemetry_batch;

      const timelineConfig: TelemetryQueryConfiguration = {
        pageSize: 1000,
      };

      telemetryConfiguration.query_config = timelineConfig;

      expect(telemetryConfiguration.telemetry_max_buffer_size).toBe(originalBufferSize);
      expect(telemetryConfiguration.max_endpoint_telemetry_batch).toBe(originalEndpointBatch);
      expect(telemetryConfiguration.query_config.pageSize).toBe(1000);
    });

    it('should reset timeline config along with other configurations', () => {
      telemetryConfiguration.telemetry_max_buffer_size = 200;
      telemetryConfiguration.query_config = { pageSize: 1000 };

      const expectedDefaults = {
        pageSize: 500,
        maxResponseSize: 10 * 1024 * 1024, // 10 MB
        maxCompressedResponseSize: 8 * 1024 * 1024, // 8 MB
      };

      telemetryConfiguration.resetAllToDefault();

      expect(telemetryConfiguration.telemetry_max_buffer_size).toBe(100); // default value
      expect(telemetryConfiguration.query_config).toEqual(expectedDefaults);
    });
  });
});
