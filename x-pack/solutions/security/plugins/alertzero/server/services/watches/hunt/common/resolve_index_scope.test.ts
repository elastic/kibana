/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { resolveHuntScope } from './resolve_index_scope';
import { MAX_SCOPE_TARGETS } from './scope_bounds';

const SPACE_ID = 'default';

/** The default data view, exclusion included. */
const UNIVERSE = ['logs-*', 'filebeat-*', 'winlogbeat-*', '-*elastic-cloud-logs-*'];

const dataStream = (name: string) => ({
  name,
  backing_indices: [`.ds-${name}-2026.09.30-000001`],
  timestamp_field: '@timestamp',
});

const resolveResponse = ({
  dataStreams = [],
  indices = [],
  aliases = [],
}: {
  dataStreams?: string[];
  indices?: string[];
  aliases?: string[];
}) => ({
  indices: indices.map((name) => ({ name, attributes: ['open'] })),
  aliases: aliases.map((name) => ({ name, indices: [] })),
  data_streams: dataStreams.map(dataStream),
});

const createEsClient = ({
  resolved = resolveResponse({ dataStreams: ['logs-okta.system-default'] }),
  fieldCaps = { indices: [], fields: {} },
}: {
  resolved?: ReturnType<typeof resolveResponse>;
  fieldCaps?: { indices: string[]; fields: Record<string, unknown> };
} = {}) => {
  const resolveIndex = jest.fn().mockResolvedValue(resolved);
  const fieldCapsFn = jest.fn().mockResolvedValue(fieldCaps);
  const esClient = {
    indices: { resolveIndex },
    fieldCaps: fieldCapsFn,
  } as unknown as ElasticsearchClient;
  return { esClient, resolveIndex, fieldCapsFn };
};

describe('resolveHuntScope', () => {
  it('resolves the universe from a mixed list of data streams, beats indices, and an exclusion', async () => {
    const { esClient, resolveIndex } = createEsClient({
      resolved: resolveResponse({
        dataStreams: ['logs-okta.system-default', 'logs-aws.cloudtrail-default'],
        indices: ['filebeat-8.15.0-2026.09.30', 'winlogbeat-2026.09.30'],
      }),
    });

    const scope = await resolveHuntScope({
      esClient,
      spaceId: SPACE_ID,
      indexPatterns: UNIVERSE,
    });

    expect(scope.resolution).toBe('universe');
    expect(scope.status).toBe('ok');
    // Tier 1 searches the list as given, exclusion kept.
    expect(scope.index_patterns).toEqual(UNIVERSE);
    expect(scope.missing).toEqual([]);
    expect(scope.discovered.map((dataset) => dataset.dataset)).toEqual([
      'aws.cloudtrail',
      'okta.system',
    ]);
    expect(resolveIndex).toHaveBeenCalledTimes(1);
    expect(resolveIndex).toHaveBeenCalledWith({
      name: UNIVERSE,
      allow_no_indices: true,
      expand_wildcards: ['open'],
    });
  });

  it('is blocked:empty_universe when nothing under any universe pattern is visible', async () => {
    const { esClient, fieldCapsFn } = createEsClient({ resolved: resolveResponse({}) });

    const scope = await resolveHuntScope({
      esClient,
      spaceId: SPACE_ID,
      indexPatterns: UNIVERSE,
    });

    expect(scope).toEqual(
      expect.objectContaining({
        status: 'blocked',
        resolution: 'blocked:empty_universe',
        index_patterns: [],
        discovered: [],
        report_matches: [],
        actionable_indices: [],
        // Exclusions are not patterns the universe could have resolved.
        missing: ['logs-*', 'filebeat-*', 'winlogbeat-*'],
      })
    );
    expect(fieldCapsFn).not.toHaveBeenCalled();
  });

  it('is blocked:empty_universe without a call when the caller supplies no positive pattern', async () => {
    const { esClient, resolveIndex } = createEsClient();

    const scope = await resolveHuntScope({
      esClient,
      spaceId: SPACE_ID,
      indexPatterns: ['-*elastic-cloud-logs-*'],
    });

    expect(scope.resolution).toBe('blocked:empty_universe');
    expect(resolveIndex).not.toHaveBeenCalled();
  });

  it('is blocked:discovery_failed and logs once when _resolve/index throws', async () => {
    const logger = loggerMock.create();
    const { esClient, resolveIndex } = createEsClient();
    resolveIndex.mockRejectedValue(new Error('cluster unavailable'));

    const scope = await resolveHuntScope({
      esClient,
      spaceId: SPACE_ID,
      indexPatterns: UNIVERSE,
      logger,
    });

    expect(scope.status).toBe('blocked');
    expect(scope.resolution).toBe('blocked:discovery_failed');
    expect(scope.index_patterns).toEqual([]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
  });

  it('lists the universe patterns that resolved nothing in missing, without degrading the scope', async () => {
    const { esClient } = createEsClient({
      resolved: resolveResponse({ dataStreams: ['logs-okta.system-default'] }),
    });

    const scope = await resolveHuntScope({
      esClient,
      spaceId: SPACE_ID,
      indexPatterns: UNIVERSE,
    });

    expect(scope.missing).toEqual(['filebeat-*', 'winlogbeat-*']);
    expect(scope.status).toBe('ok');
  });

  it('counts a pattern as resolved when only an alias or a backing index answers to it', async () => {
    const { esClient } = createEsClient({
      resolved: resolveResponse({ aliases: ['filebeat-alias'] }),
    });

    const scope = await resolveHuntScope({
      esClient,
      spaceId: SPACE_ID,
      indexPatterns: ['filebeat-*', 'winlogbeat-*'],
    });

    expect(scope.resolution).toBe('universe');
    expect(scope.missing).toEqual(['winlogbeat-*']);
  });

  it('never searches alerts: the universe is exactly what the caller supplied', async () => {
    const { esClient } = createEsClient();

    const scope = await resolveHuntScope({
      esClient,
      spaceId: SPACE_ID,
      indexPatterns: UNIVERSE,
    });

    expect(scope.index_patterns.some((pattern) => pattern.includes('.alerts-'))).toBe(false);
  });

  describe('report matching', () => {
    const resolved = resolveResponse({
      dataStreams: [
        'logs-aws.cloudtrail-default',
        'logs-okta.system-default',
        'logs-fortinet_fortigate.log-default',
      ],
    });

    it('matches the vendor "Amazon" to the aws dataset', async () => {
      const { esClient } = createEsClient({ resolved });
      const scope = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        indexPatterns: UNIVERSE,
        report: { vendor: 'Amazon' },
      });

      expect(scope.report_matches).toEqual(['logs-aws.cloudtrail-*']);
    });

    it('matches the product "FortiGate" to fortinet_fortigate.log', async () => {
      const { esClient } = createEsClient({ resolved });
      const scope = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        indexPatterns: UNIVERSE,
        report: { vendor: 'Fortinet', product: 'FortiGate' },
      });

      expect(scope.report_matches).toEqual(['logs-fortinet_fortigate.log-*']);
    });

    it('leaves report_matches empty for a report that names no vendor or product', async () => {
      const { esClient } = createEsClient({ resolved });
      const scope = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        indexPatterns: UNIVERSE,
        report: { text: 'an article with no vendor' },
      });

      expect(scope.report_matches).toEqual([]);
      expect(scope.status).toBe('ok');
    });

    it('collapses a match list too long for the request path onto vendor wildcards and reads degraded', async () => {
      const logger = loggerMock.create();
      const dataStreams = Array.from(
        { length: MAX_SCOPE_TARGETS + 1 },
        (_, i) => `logs-acme.stream${i}-default`
      );
      const { esClient } = createEsClient({ resolved: resolveResponse({ dataStreams }) });

      const scope = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        indexPatterns: UNIVERSE,
        report: { vendor: 'Acme' },
        logger,
      });

      expect(scope.report_matches).toEqual(['logs-acme.*', 'logs-acme-*']);
      expect(scope.status).toBe('degraded');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('vendor wildcard'));
    });

    it('never calls a model: the model matcher belongs to stage 2', async () => {
      const { esClient } = createEsClient({ resolved });
      const scope = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        indexPatterns: UNIVERSE,
        report: { vendor: 'Zscaler', text: 'article about zscaler' },
      });

      expect(scope.resolution).toBe('universe');
      expect(scope.report_matches).toEqual([]);
    });
  });

  describe('actionable_indices', () => {
    it('names the indices whose mapping carries a process identity, from the universe', async () => {
      const { esClient, fieldCapsFn } = createEsClient({
        resolved: resolveResponse({
          dataStreams: ['logs-okta.system-default', 'logs-endpoint.events.process-default'],
        }),
        fieldCaps: {
          indices: [
            '.ds-logs-okta.system-default-2026.09.30-000001',
            '.ds-logs-endpoint.events.process-default-2026.09.30-000001',
          ],
          fields: {
            'process.entity_id': {
              keyword: {
                type: 'keyword',
                indices: ['.ds-logs-endpoint.events.process-default-2026.09.30-000001'],
              },
            },
          },
        },
      });

      const scope = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        indexPatterns: UNIVERSE,
      });

      expect(scope.actionable_indices).toEqual(['logs-endpoint.events.process-default*']);
      expect(fieldCapsFn).toHaveBeenCalledWith(
        expect.objectContaining({
          index: UNIVERSE,
          fields: ['process.entity_id', 'process.pid'],
        })
      );
    });

    it('reads degraded, never blocked, when _field_caps fails', async () => {
      const { esClient, fieldCapsFn } = createEsClient();
      fieldCapsFn.mockRejectedValue(new Error('field caps unavailable'));

      const scope = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        indexPatterns: UNIVERSE,
      });

      expect(scope.status).toBe('degraded');
      expect(scope.resolution).toBe('universe');
      expect(scope.actionable_indices).toEqual([]);
      expect(scope.index_patterns).toEqual(UNIVERSE);
    });
  });

  it('defaults the row limit to 25 and the window to a 30-day lookback', async () => {
    const { esClient } = createEsClient();
    const before = Date.now();
    const scope = await resolveHuntScope({
      esClient,
      spaceId: SPACE_ID,
      indexPatterns: UNIVERSE,
    });
    const after = Date.now();

    expect(scope.row_limit).toBe(25);
    const fromMs = new Date(scope.window.from).getTime();
    const toMs = new Date(scope.window.to).getTime();
    expect(toMs).toBeGreaterThanOrEqual(before);
    expect(toMs).toBeLessThanOrEqual(after);
    expect(toMs - fromMs).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -3);
  });

  it('honors a caller-supplied window and row limit, blocked or not', async () => {
    const window = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
    const { esClient } = createEsClient({ resolved: resolveResponse({}) });

    const scope = await resolveHuntScope({
      esClient,
      spaceId: SPACE_ID,
      indexPatterns: UNIVERSE,
      window,
      row_limit: 100,
    });

    expect(scope.window).toEqual(window);
    expect(scope.row_limit).toBe(100);
  });
});
