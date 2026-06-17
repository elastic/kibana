/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSynthtraceCommand, SYNTHTRACE_SCENARIOS } from './synthtrace_catalog';

describe('buildSynthtraceCommand', () => {
  it('builds a historical command with default time range', () => {
    expect(buildSynthtraceCommand('simple_trace')).toBe(
      'node scripts/synthtrace simple_trace --from=now-1w --to=now'
    );
  });

  it('omits the time range and adds --live in live mode', () => {
    expect(buildSynthtraceCommand('simple_trace', { live: true })).toBe(
      'node scripts/synthtrace simple_trace --live'
    );
  });

  it('appends --clean when requested', () => {
    expect(buildSynthtraceCommand('logs_and_metrics', { clean: true })).toBe(
      'node scripts/synthtrace logs_and_metrics --from=now-1w --to=now --clean'
    );
  });

  it('embeds connection flags when provided', () => {
    expect(
      buildSynthtraceCommand('simple_trace', {
        connection: {
          esUrl: 'http://localhost:9200',
          kibanaUrl: 'http://localhost:5601',
          username: 'elastic',
          password: 'changeme',
        },
      })
    ).toBe(
      'node scripts/synthtrace simple_trace --target=http://elastic:changeme@localhost:9200/ --kibana=http://localhost:5601 --from=now-1w --to=now'
    );
  });
});

describe('SYNTHTRACE_SCENARIOS', () => {
  it('every scenario declares at least one data type and a unique id', () => {
    const ids = SYNTHTRACE_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
    SYNTHTRACE_SCENARIOS.forEach((scenario) => {
      expect(scenario.dataTypes.length).toBeGreaterThan(0);
    });
  });
});
