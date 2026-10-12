/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  boundTargetPatterns,
  classifyActionableIndices,
  collapseIndexName,
  collapseToDataSourcePattern,
} from './classify_actionable_indices';
import { MAX_SCOPE_TARGETS } from './scope_bounds';

const UNIVERSE = ['logs-*', 'filebeat-*', '-*elastic-cloud-logs-*'];

const fieldCapsMock = jest.fn();
const esClient = { fieldCaps: fieldCapsMock } as unknown as ElasticsearchClient;

const capability = (indices?: string[]) => ({
  type: 'keyword',
  metadata_field: false,
  searchable: true,
  aggregatable: true,
  ...(indices ? { indices } : {}),
});

describe('collapseIndexName', () => {
  it('collapses a data stream backing index to its stream with a wildcard', () => {
    expect(collapseIndexName('.ds-logs-okta.system-default-2026.09.30-000001')).toBe(
      'logs-okta.system-default*'
    );
  });

  it('collapses a beats-style data stream backing index', () => {
    expect(collapseIndexName('.ds-filebeat-8.15.0-2026.09.30-000002')).toBe('filebeat-8.15.0*');
  });

  it('keeps a plain index and adds the wildcard', () => {
    expect(collapseIndexName('logs-endpoint.events.e8c68216.2026.09.29')).toBe(
      'logs-endpoint.events.e8c68216.2026.09.29*'
    );
  });
});

describe('collapseToDataSourcePattern', () => {
  it.each([
    [
      'a data stream backing index',
      '.ds-logs-aws.cloudtrail-default-2026.10.08-000001',
      'logs-aws.cloudtrail-*',
    ],
    ['an existing dataset pattern', 'logs-aws.cloudtrail-*', 'logs-aws.cloudtrail-*'],
    ['a beats backing index', 'filebeat-8.17.0-2026.10.08', 'filebeat-*'],
    ['an endgame index', 'endgame-2026.10.08', 'endgame-*'],
    ['a plain pack index', 'logs-endpoint.events.00e5ea78.2026.10.08', undefined],
    [
      'a Defend alerts data stream',
      '.ds-logs-endpoint.alerts-default-2026.10.08-000001',
      undefined,
    ],
    ['a security alerts index', '.alerts-security.alerts-default', undefined],
    [
      'an agent-internal dataset',
      '.ds-logs-elastic_agent.filebeat-default-2026.10.08-000001',
      undefined,
    ],
    ['an unknown family', 'custom-index-2026.10.08', undefined],
  ])('returns the expected pattern for %s', (_label, name, expected) => {
    expect(collapseToDataSourcePattern(name)).toBe(expected);
  });
});

describe('boundTargetPatterns', () => {
  it('returns a list that fits as given, deduped and in order', () => {
    expect(
      boundTargetPatterns(['logs-okta.system-*', 'logs-aws.cloudtrail-*', 'logs-okta.system-*'])
    ).toEqual({
      patterns: ['logs-okta.system-*', 'logs-aws.cloudtrail-*'],
      collapsed: false,
      fits: true,
    });
  });

  it('collapses past the bound to one pattern per dataset', () => {
    const datasets = MAX_SCOPE_TARGETS / 2;
    const patterns = Array.from({ length: datasets }, (_, i) => [
      `logs-vendor${i}.stream-default*`,
      `logs-vendor${i}.stream-prod*`,
      `logs-vendor${i}.stream-staging*`,
    ]).flat();

    const bounded = boundTargetPatterns(patterns);

    expect(bounded.patterns).toHaveLength(datasets);
    expect(bounded.patterns).toContain('logs-vendor0.stream-*');
    expect(bounded).toEqual(expect.objectContaining({ collapsed: true, fits: true }));
  });

  it('collapses to a wildcard pair per vendor when per-dataset patterns still do not fit', () => {
    const patterns = Array.from(
      { length: MAX_SCOPE_TARGETS + 1 },
      (_, i) => `logs-vendor0.stream${i}-default*`
    );

    expect(boundTargetPatterns(patterns)).toEqual({
      patterns: ['logs-vendor0-*', 'logs-vendor0.*'],
      collapsed: true,
      fits: true,
    });
  });

  it('reports that nothing fits when even the vendor wildcards overflow', () => {
    const patterns = Array.from(
      { length: MAX_SCOPE_TARGETS },
      (_, i) => `logs-vendor${i}.stream-default*`
    );

    const bounded = boundTargetPatterns([
      ...patterns,
      ...patterns.map((p) => p.replace('logs-', 'metrics-')),
    ]);

    expect(bounded.collapsed).toBe(true);
    expect(bounded.fits).toBe(false);
  });
});

describe('classifyActionableIndices', () => {
  beforeEach(() => {
    fieldCapsMock.mockReset();
  });

  it('maps a .ds- backing index to its stream and a plain index to itself, each with a wildcard', async () => {
    fieldCapsMock.mockResolvedValue({
      indices: [],
      fields: {
        'process.entity_id': {
          keyword: capability([
            '.ds-logs-endpoint.events.process-default-2026.09.30-000001',
            'logs-endpoint.events.e8c68216.2026.09.29',
          ]),
        },
      },
    });

    await expect(classifyActionableIndices({ esClient, indexPatterns: UNIVERSE })).resolves.toEqual(
      {
        patterns: [
          'logs-endpoint.events.e8c68216.2026.09.29*',
          'logs-endpoint.events.process-default*',
        ],
        degraded: false,
      }
    );
  });

  it('treats a missing `indices` as every index of the request', async () => {
    fieldCapsMock.mockResolvedValue({
      indices: [
        '.ds-logs-endpoint.events.process-default-2026.09.30-000001',
        'winlogbeat-2026.09.30',
      ],
      fields: { 'process.pid': { long: capability() } },
    });

    const result = await classifyActionableIndices({ esClient, indexPatterns: UNIVERSE });

    expect(result.patterns).toEqual([
      'logs-endpoint.events.process-default*',
      'winlogbeat-2026.09.30*',
    ]);
  });

  it('unions both fields and dedupes an index that carries both', async () => {
    const backing = '.ds-logs-endpoint.events.process-default-2026.09.30-000001';
    fieldCapsMock.mockResolvedValue({
      indices: [],
      fields: {
        'process.entity_id': { keyword: capability([backing]) },
        'process.pid': {
          long: capability([backing, '.ds-logs-system.auth-default-2026.09.30-000001']),
        },
      },
    });

    const result = await classifyActionableIndices({ esClient, indexPatterns: UNIVERSE });

    expect(result.patterns).toEqual([
      'logs-endpoint.events.process-default*',
      'logs-system.auth-default*',
    ]);
  });

  it('unions indices across the types a field is mapped as', async () => {
    fieldCapsMock.mockResolvedValue({
      indices: [],
      fields: {
        'process.pid': {
          long: capability(['.ds-logs-a.b-default-2026.09.30-000001']),
          keyword: capability(['.ds-logs-c.d-default-2026.09.30-000001']),
        },
      },
    });

    const result = await classifyActionableIndices({ esClient, indexPatterns: UNIVERSE });

    expect(result.patterns).toEqual(['logs-a.b-default*', 'logs-c.d-default*']);
  });

  it('asks about the universe with its exclusions and never emits an exclusion', async () => {
    fieldCapsMock.mockResolvedValue({
      indices: ['.ds-logs-endpoint.events.process-default-2026.09.30-000001'],
      fields: { 'process.pid': { long: capability() } },
    });

    const result = await classifyActionableIndices({ esClient, indexPatterns: UNIVERSE });

    expect(fieldCapsMock).toHaveBeenCalledWith({
      index: UNIVERSE,
      fields: ['process.entity_id', 'process.pid'],
      ignore_unavailable: true,
      allow_no_indices: true,
      expand_wildcards: 'open',
      include_unmapped: true,
    });
    expect(result.patterns.some((pattern) => pattern.startsWith('-'))).toBe(false);
  });

  it('leaves out indices reported under the unmapped type, which do not carry the field', async () => {
    // Shape of a live response over 25 indices where 3 do not map the fields: the mapped type
    // lists only the indices that have it, and the rest come back as `unmapped`.
    fieldCapsMock.mockResolvedValue({
      indices: [
        '.ds-logs-endpoint.events.process-default-2026.09.30-000001',
        '.ds-logs-aws.cloudtrail-default-2026.09.30-000001',
        '.ds-logs-okta.system-default-2026.09.30-000001',
      ],
      fields: {
        'process.pid': {
          long: capability(['.ds-logs-endpoint.events.process-default-2026.09.30-000001']),
          unmapped: capability([
            '.ds-logs-aws.cloudtrail-default-2026.09.30-000001',
            '.ds-logs-okta.system-default-2026.09.30-000001',
          ]),
        },
        'process.entity_id': {
          keyword: capability(['.ds-logs-endpoint.events.process-default-2026.09.30-000001']),
          unmapped: capability([
            '.ds-logs-aws.cloudtrail-default-2026.09.30-000001',
            '.ds-logs-okta.system-default-2026.09.30-000001',
          ]),
        },
      },
    });

    const result = await classifyActionableIndices({ esClient, indexPatterns: UNIVERSE });

    expect(result).toEqual({
      patterns: ['logs-endpoint.events.process-default*'],
      degraded: false,
    });
  });

  it('returns [] when every index is reported as unmapped', async () => {
    fieldCapsMock.mockResolvedValue({
      indices: ['.ds-logs-okta.system-default-2026.09.30-000001'],
      fields: {
        'process.pid': {
          unmapped: capability(['.ds-logs-okta.system-default-2026.09.30-000001']),
        },
      },
    });

    await expect(classifyActionableIndices({ esClient, indexPatterns: UNIVERSE })).resolves.toEqual(
      { patterns: [], degraded: false }
    );
  });

  it('returns [] when no index maps either field', async () => {
    fieldCapsMock.mockResolvedValue({ indices: ['logs-okta.system-default'], fields: {} });

    await expect(classifyActionableIndices({ esClient, indexPatterns: UNIVERSE })).resolves.toEqual(
      { patterns: [], degraded: false }
    );
  });

  it('drops agent-internal datasets', async () => {
    fieldCapsMock.mockResolvedValue({
      indices: [
        '.ds-logs-elastic_agent.filebeat-default-2026.09.30-000001',
        '.ds-logs-fleet_server.output_health-default-2026.09.30-000001',
        '.ds-logs-endpoint.events.process-default-2026.09.30-000001',
      ],
      fields: { 'process.pid': { long: capability() } },
    });

    const result = await classifyActionableIndices({ esClient, indexPatterns: UNIVERSE });

    expect(result.patterns).toEqual(['logs-endpoint.events.process-default*']);
  });

  it('collapses past the request-path bound to one pattern per dataset and reads degraded', async () => {
    const logger = loggerMock.create();
    const indices = Array.from(
      { length: MAX_SCOPE_TARGETS + 1 },
      (_, i) => `.ds-logs-acme.source${i}-default-2026.09.30-000001`
    );
    fieldCapsMock.mockResolvedValue({
      indices,
      fields: { 'process.pid': { long: capability() } },
    });

    const result = await classifyActionableIndices({ esClient, indexPatterns: UNIVERSE, logger });

    expect(result.degraded).toBe(true);
    // One per dataset is still past the bound here, so it lands on the vendor wildcard pair.
    expect(result.patterns).toEqual(['logs-acme-*', 'logs-acme.*']);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('collapses beats-style names to their first segment', async () => {
    const indices = Array.from(
      { length: MAX_SCOPE_TARGETS + 1 },
      (_, i) => `.ds-filebeat-8.${i}.0-2026.09.30-000001`
    );
    fieldCapsMock.mockResolvedValue({
      indices,
      fields: { 'process.pid': { long: capability() } },
    });

    const result = await classifyActionableIndices({ esClient, indexPatterns: UNIVERSE });

    expect(result).toEqual({ patterns: ['filebeat-*'], degraded: true });
  });

  it('names none rather than a list the SSE would silently truncate when nothing fits', async () => {
    const logger = loggerMock.create();
    const vendors = Array.from({ length: MAX_SCOPE_TARGETS }, (_, i) => `vendor${i}`);
    fieldCapsMock.mockResolvedValue({
      indices: vendors.flatMap((vendor) => [
        `.ds-logs-${vendor}.stream-default-2026.09.30-000001`,
        `.ds-metrics-${vendor}.stream-default-2026.09.30-000001`,
      ]),
      fields: { 'process.pid': { long: capability() } },
    });

    const result = await classifyActionableIndices({ esClient, indexPatterns: UNIVERSE, logger });

    expect(result).toEqual({ patterns: [], degraded: true });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('naming none this run'));
  });

  it('logs once and returns [] degraded when _field_caps fails', async () => {
    const logger = loggerMock.create();
    fieldCapsMock.mockRejectedValue(new Error('field caps unavailable'));

    await expect(
      classifyActionableIndices({ esClient, indexPatterns: UNIVERSE, logger })
    ).resolves.toEqual({ patterns: [], degraded: true });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('field caps unavailable'));
  });
});
