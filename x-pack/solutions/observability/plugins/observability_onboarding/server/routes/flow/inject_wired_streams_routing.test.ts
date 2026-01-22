/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';
import { injectWiredStreamsRouting } from './inject_wired_streams_routing';

describe('injectWiredStreamsRouting', () => {
  it('should inject routing processor for logs streams', () => {
    const inputYaml = `
inputs:
  - id: system-logfile
    type: logfile
    streams:
      - id: logfile-system.auth
        data_stream:
          dataset: system.auth
          type: logs
        paths:
          - /var/log/auth.log*
        processors:
          - add_locale: null
`;

    const result = injectWiredStreamsRouting(inputYaml);
    const parsed = load(result);

    // Should have the routing processor prepended
    expect(parsed.inputs[0].streams[0].processors).toHaveLength(2);
    expect(parsed.inputs[0].streams[0].processors[0]).toEqual({
      add_fields: {
        target: '@metadata',
        fields: {
          raw_index: 'logs',
        },
      },
    });
    // Original processor should still be there
    expect(parsed.inputs[0].streams[0].processors[1]).toEqual({
      add_locale: null,
    });
  });

  it('should NOT inject routing processor for metrics streams', () => {
    const inputYaml = `
inputs:
  - id: system-metrics
    type: system/metrics
    streams:
      - id: system-metrics.cpu
        data_stream:
          dataset: system.cpu
          type: metrics
        metricsets:
          - cpu
`;

    const result = injectWiredStreamsRouting(inputYaml);
    const parsed = load(result) as any;

    // Should NOT have any processors added (none existed before)
    expect(parsed.inputs[0].streams[0].processors).toBeUndefined();
  });

  it('should handle multiple streams with mixed types', () => {
    const inputYaml = `
inputs:
  - id: system-logfile
    type: logfile
    streams:
      - id: logfile-system.auth
        data_stream:
          dataset: system.auth
          type: logs
        paths:
          - /var/log/auth.log*
      - id: logfile-system.syslog
        data_stream:
          dataset: system.syslog
          type: logs
        paths:
          - /var/log/syslog*
  - id: system-metrics
    type: system/metrics
    streams:
      - id: system-metrics.cpu
        data_stream:
          dataset: system.cpu
          type: metrics
`;

    const result = injectWiredStreamsRouting(inputYaml);
    const parsed = load(result) as any;

    // First input (logs) - both streams should have the processor
    expect(parsed.inputs[0].streams[0].processors).toHaveLength(1);
    expect(parsed.inputs[0].streams[0].processors[0].add_fields.fields.raw_index).toBe('logs');

    expect(parsed.inputs[0].streams[1].processors).toHaveLength(1);
    expect(parsed.inputs[0].streams[1].processors[0].add_fields.fields.raw_index).toBe('logs');

    // Second input (metrics) - should NOT have processors
    expect(parsed.inputs[1].streams[0].processors).toBeUndefined();
  });

  it('should handle inputs without streams (data_stream at input level)', () => {
    const inputYaml = `
inputs:
  - id: custom-logs
    type: filestream
    data_stream:
      type: logs
      dataset: custom
    paths:
      - /var/log/custom.log
`;

    const result = injectWiredStreamsRouting(inputYaml);
    const parsed = load(result) as any;

    // Should have the routing processor at input level
    expect(parsed.inputs[0].processors).toHaveLength(1);
    expect(parsed.inputs[0].processors[0]).toEqual({
      add_fields: {
        target: '@metadata',
        fields: {
          raw_index: 'logs',
        },
      },
    });
  });

  it('should return original yaml if no inputs', () => {
    const inputYaml = `
some_other_config: value
`;

    const result = injectWiredStreamsRouting(inputYaml);
    expect(result.trim()).toContain('some_other_config: value');
  });

  it('should preserve existing processors when adding routing', () => {
    const inputYaml = `
inputs:
  - id: system-logfile
    type: logfile
    streams:
      - id: logfile-system.auth
        data_stream:
          dataset: system.auth
          type: logs
        paths:
          - /var/log/auth.log*
        processors:
          - rename:
              fields:
                - from: message
                  to: event.original
          - syslog:
              field: event.original
`;

    const result = injectWiredStreamsRouting(inputYaml);
    const parsed = load(result) as any;

    // Should have 3 processors now (1 new + 2 existing)
    expect(parsed.inputs[0].streams[0].processors).toHaveLength(3);

    // Routing processor should be first
    expect(parsed.inputs[0].streams[0].processors[0].add_fields.fields.raw_index).toBe('logs');

    // Original processors should follow
    expect(parsed.inputs[0].streams[0].processors[1]).toHaveProperty('rename');
    expect(parsed.inputs[0].streams[0].processors[2]).toHaveProperty('syslog');
  });

  it('should handle journald inputs with logs type', () => {
    const inputYaml = `
inputs:
  - id: system-journald
    type: journald
    streams:
      - id: journald-system.auth
        data_stream:
          dataset: system.auth
          type: logs
        facilities:
          - 4
          - 10
`;

    const result = injectWiredStreamsRouting(inputYaml);
    const parsed = load(result) as any;

    // Should have the routing processor
    expect(parsed.inputs[0].streams[0].processors).toHaveLength(1);
    expect(parsed.inputs[0].streams[0].processors[0].add_fields.fields.raw_index).toBe('logs');
  });
});
