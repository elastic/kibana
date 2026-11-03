/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getRerouteDataset } from './get_reroute_dataset';

describe('getRerouteDataset', () => {
  it('uses the .otel dataset from the index pattern of an OTel input template', () => {
    expect(
      getRerouteDataset('logs-claude_cowork.events', ['logs-claude_cowork.events.otel-*'])
    ).toEqual({ dataset: 'claude_cowork.events.otel', resolvedFromPattern: true });
  });

  it('resolves the same dataset as the template name for regular templates', () => {
    expect(getRerouteDataset('logs-nginx.access', ['logs-nginx.access-*'])).toEqual({
      dataset: 'nginx.access',
      resolvedFromPattern: true,
    });
  });

  it('resolves metrics templates', () => {
    expect(getRerouteDataset('metrics-system.cpu', ['metrics-system.cpu-*'])).toEqual({
      dataset: 'system.cpu',
      resolvedFromPattern: true,
    });
  });

  it('uses the first routable pattern when there are several', () => {
    expect(
      getRerouteDataset('logs-foo', ['logs-foo.*-*', 'logs-foo.otel-*', 'logs-foo-*'])
    ).toEqual({ dataset: 'foo.otel', resolvedFromPattern: true });
  });

  it('falls back to the template name when there are no index patterns', () => {
    expect(getRerouteDataset('logs-destination1.cloud')).toEqual({
      dataset: 'destination1.cloud',
      resolvedFromPattern: false,
    });
  });

  it('falls back to the template name for dataset_is_prefix patterns', () => {
    expect(getRerouteDataset('metrics-foo', ['metrics-foo.*-*'])).toEqual({
      dataset: 'foo',
      resolvedFromPattern: false,
    });
  });

  it('falls back to the template name for hidden templates', () => {
    expect(getRerouteDataset('.logs-foo', ['.logs-foo-*'])).toEqual({
      dataset: 'foo',
      resolvedFromPattern: false,
    });
  });

  it('falls back to the template name for namespace-scoped templates', () => {
    expect(
      getRerouteDataset('logs-nginx.access@namespace.production', ['logs-nginx.access-production'])
    ).toEqual({ dataset: 'nginx.access@namespace.production', resolvedFromPattern: false });
  });
});
