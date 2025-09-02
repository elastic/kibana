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

    it('should allow setting all timeline configuration properties', () => {
      const config: TelemetryQueryConfiguration = {
        pageSize: 500,
        maxResponseSize: 2500000,
        maxCompressedResponseSize: 500000,
      };

      telemetryConfiguration.query_config = config;
      expect(telemetryConfiguration.query_config).toEqual(config);
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
  });
});
