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
    });
  });
});
