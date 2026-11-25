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
  unreadable = [],
}: {
  resolved?: ReturnType<typeof resolveResponse>;
  fieldCaps?: { indices: string[]; fields: Record<string, unknown> };
  /** Names the caller resolves but holds no `read` on. */
  unreadable?: string[];
} = {}) => {
  const resolveIndex = jest.fn().mockResolvedValue(resolved);
  const fieldCapsFn = jest.fn().mockResolvedValue(fieldCaps);
  const hasPrivileges = jest.fn(
    async ({ index }: { index: Array<{ names: string[]; privileges: string[] }> }) => ({
      index: Object.fromEntries(
        index
          .flatMap(({ names }) => names)
          .map((name) => [name, { read: !unreadable.includes(name) }])
      ),
    })
  );
  const esClient = {
    indices: { resolveIndex },
    fieldCaps: fieldCapsFn,
    security: { hasPrivileges },
  } as unknown as ElasticsearchClient;
  return { esClient, resolveIndex, fieldCapsFn, hasPrivileges };
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
    // Tier 1 searches the whole list, exclusion kept.
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
      ignore_unavailable: true,
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

  describe('a pattern that resolves only on a linked project', () => {
    const linkedOnly = () =>
      createEsClient({
        resolved: resolveResponse({ dataStreams: ['linked:logs-okta.system-default'] }),
      });

    it('is missing under cross-cluster semantics, where an unqualified pattern stays local', async () => {
      const { esClient } = linkedOnly();

      const scope = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        indexPatterns: ['logs-*'],
      });

      expect(scope.missing).toEqual(['logs-*']);
    });

    it('is not missing with cross-project search on, where it reaches linked projects', async () => {
      const { esClient } = linkedOnly();

      const scope = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        indexPatterns: ['logs-*', 'winlogbeat-*'],
        crossProjectSearch: true,
      });

      expect(scope.missing).toEqual(['winlogbeat-*']);
    });
  });

  it('never searches alerts: the universe is the list the caller passed', async () => {
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

  describe('policy_skipped', () => {
    const SKIPPED = ['.siem-signals-infosec-detections'];
    const resolveWith = (
      indexPatterns: string[],
      env: ReturnType<typeof createEsClient>,
      policySkippedPatterns?: string[]
    ) =>
      resolveHuntScope({
        esClient: env.esClient,
        spaceId: SPACE_ID,
        indexPatterns,
        policySkippedPatterns,
      });

    it('echoes the skipped list, defaulting to an empty one', async () => {
      expect((await resolveWith(['logs-*'], createEsClient(), SKIPPED)).policy_skipped).toEqual(
        SKIPPED
      );
      expect((await resolveWith(['logs-*'], createEsClient())).policy_skipped).toEqual([]);
    });

    it('echoes it on a degraded scope', async () => {
      const env = createEsClient();
      env.fieldCapsFn.mockRejectedValue(new Error('field caps failed'));

      const scope = await resolveWith(['logs-*'], env, SKIPPED);

      expect(scope.status).toBe('degraded');
      expect(scope.policy_skipped).toEqual(SKIPPED);
    });

    it('echoes it on every blocked path', async () => {
      const noPositive = createEsClient();
      const noPositiveScope = await resolveWith(['-foo*'], noPositive, SKIPPED);
      expect(noPositiveScope.policy_skipped).toEqual(SKIPPED);
      expect(noPositive.resolveIndex).not.toHaveBeenCalled();

      const empty = await resolveWith(
        ['logs-*'],
        createEsClient({ resolved: resolveResponse({}) }),
        SKIPPED
      );
      expect(empty.policy_skipped).toEqual(SKIPPED);

      const failing = createEsClient();
      failing.resolveIndex.mockRejectedValue(new Error('denied'));
      const failed = await resolveWith(['logs-*'], failing, SKIPPED);
      expect(failed.resolution).toBe('blocked:discovery_failed');
      expect(failed.policy_skipped).toEqual(SKIPPED);
    });
  });

  describe('lenient resolve and pruning', () => {
    const run = (
      indexPatterns: string[],
      resolved: ReturnType<typeof resolveResponse>,
      extra: { crossProjectSearch?: boolean } = {}
    ) => {
      const env = createEsClient({ resolved });
      return {
        ...env,
        scope: resolveHuntScope({
          esClient: env.esClient,
          spaceId: SPACE_ID,
          indexPatterns,
          ...extra,
        }),
      };
    };

    it('drops an unresolved local concrete name from the searched list and keeps it in missing', async () => {
      const { scope, fieldCapsFn } = run(
        ['logs-*', 'custom-edr-1'],
        resolveResponse({ dataStreams: ['logs-okta.system-default'] })
      );
      const result = await scope;

      expect(result.status).toBe('ok');
      expect(result.index_patterns).toEqual(['logs-*']);
      expect(result.missing).toEqual(['custom-edr-1']);
      expect(fieldCapsFn).toHaveBeenCalledWith(expect.objectContaining({ index: ['logs-*'] }));
    });

    it('keeps an unresolved wildcard in index_patterns and in missing', async () => {
      const result = await run(
        ['logs-*', 'winlogbeat-*'],
        resolveResponse({ dataStreams: ['logs-okta.system-default'] })
      ).scope;

      expect(result.index_patterns).toEqual(['logs-*', 'winlogbeat-*']);
      expect(result.missing).toEqual(['winlogbeat-*']);
    });

    it('does not report a resolving .ds- backing entry missing, and does not drop it', async () => {
      const backing = '.ds-logs-okta.system-default-2026.09.30-000001';
      const result = await run(
        ['logs-*', backing],
        resolveResponse({ dataStreams: ['logs-okta.system-default'] })
      ).scope;

      expect(result.missing).toEqual([]);
      expect(result.index_patterns).toEqual(['logs-*', backing]);
    });

    it.each([
      'remote:custom-1',
      '*:custom-1',
      '<logs-{now/d}>',
      '<logs-{now/d{yyyy.MM.dd|+12:00}}>',
      'logs-*::failures',
      'custom-1::failures',
      'custom-1,custom-2',
      '_all',
    ])('never drops %s', async (entry) => {
      const result = await run(
        ['logs-*', entry],
        resolveResponse({ dataStreams: ['logs-okta.system-default'] })
      ).scope;

      expect(result.index_patterns).toContain(entry);
    });

    it('under cross-project search drops no name, since a miss may be a linked project that did not answer', async () => {
      const result = await run(
        ['logs-*', 'custom-1', 'custom-2'],
        resolveResponse({
          dataStreams: ['logs-okta.system-default'],
          indices: ['linked:custom-1'],
        }),
        { crossProjectSearch: true }
      ).scope;

      expect(result.index_patterns).toEqual(['logs-*', 'custom-1', 'custom-2']);
      expect(result.missing).toEqual(['custom-2']);
    });

    it('removes every duplicate of a dropped name', async () => {
      const result = await run(
        ['logs-*', 'custom-1', 'custom-1'],
        resolveResponse({ dataStreams: ['logs-okta.system-default'] })
      ).scope;

      expect(result.index_patterns).toEqual(['logs-*']);
    });

    it('is blocked:empty_universe when only unresolved local concrete names would remain', async () => {
      const result = await run(['custom-1', '-foo*'], resolveResponse({ indices: ['unrelated-1'] }))
        .scope;

      expect(result.resolution).toBe('blocked:empty_universe');
      expect(result.missing).toEqual(['custom-1']);
    });

    it.each([['no_such_remote_cluster_exception'], ['no_matching_project_exception']])(
      'is blocked:discovery_failed when the resolve throws %s',
      async (type) => {
        const env = createEsClient();
        env.resolveIndex.mockRejectedValue(Object.assign(new Error(type), { name: type }));

        const result = await resolveHuntScope({
          esClient: env.esClient,
          spaceId: SPACE_ID,
          indexPatterns: ['logs-*', 'remote:logs-*'],
        });

        expect(result.resolution).toBe('blocked:discovery_failed');
      }
    );

    describe('a concrete name that resolves but cannot be searched', () => {
      const logger = loggerMock.create();
      const resolved = resolveResponse({
        dataStreams: ['logs-okta.system-default'],
        indices: ['custom-meta-1', 'custom-read-1'],
      });
      const indexPatterns = ['logs-*', 'custom-meta-1', 'custom-read-1', '-logs-x*'];

      beforeEach(() => logger.warn.mockClear());

      it('drops a name the caller holds no read on and keeps it in missing', async () => {
        const { esClient, hasPrivileges } = createEsClient({
          resolved,
          unreadable: ['custom-meta-1'],
        });

        const scope = await resolveHuntScope({ esClient, spaceId: SPACE_ID, indexPatterns });

        expect(scope.status).toBe('ok');
        expect(scope.index_patterns).toEqual(['logs-*', 'custom-read-1', '-logs-x*']);
        expect(scope.missing).toEqual(['custom-meta-1']);
        // One call, for the resolved concrete names only: no wildcard, no exclusion.
        expect(hasPrivileges).toHaveBeenCalledTimes(1);
        expect(hasPrivileges).toHaveBeenCalledWith({
          index: [{ names: ['custom-meta-1', 'custom-read-1'], privileges: ['read'] }],
        });
      });

      it('drops a closed index, which resolves by name and cannot be read', async () => {
        const { esClient } = createEsClient({
          resolved: {
            ...resolved,
            indices: [
              { name: 'custom-meta-1', attributes: ['closed'] },
              { name: 'custom-read-1', attributes: ['open'] },
            ],
          },
        });

        const scope = await resolveHuntScope({ esClient, spaceId: SPACE_ID, indexPatterns });

        expect(scope.index_patterns).toEqual(['logs-*', 'custom-read-1', '-logs-x*']);
        expect(scope.missing).toEqual(['custom-meta-1']);
      });

      it('lists unresolved and unreadable names in data view order', async () => {
        const { esClient } = createEsClient({ resolved, unreadable: ['custom-meta-1'] });

        const scope = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          indexPatterns: ['custom-meta-1', 'logs-*', 'custom-absent-1'],
        });

        expect(scope.missing).toEqual(['custom-meta-1', 'custom-absent-1']);
        expect(scope.index_patterns).toEqual(['logs-*']);
      });

      it('asks nothing when the universe names no resolved concrete name', async () => {
        const { esClient, hasPrivileges } = createEsClient({ resolved });

        await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          indexPatterns: ['logs-*', 'custom-absent-1', 'remote:custom-meta-1'],
        });

        expect(hasPrivileges).not.toHaveBeenCalled();
      });

      it('does not check a .ds- backing index, which is readable through its data stream', async () => {
        const backing = '.ds-logs-okta.system-default-2026.09.30-000001';
        const { esClient, hasPrivileges } = createEsClient({ resolved, unreadable: [backing] });

        const scope = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          indexPatterns: [backing],
        });

        expect(hasPrivileges).not.toHaveBeenCalled();
        expect(scope.index_patterns).toEqual([backing]);
      });

      it('does not check under cross-project search, where the local answer is not the whole one', async () => {
        const { esClient, hasPrivileges } = createEsClient({
          resolved,
          unreadable: ['custom-meta-1'],
        });

        const scope = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          indexPatterns,
          crossProjectSearch: true,
        });

        expect(hasPrivileges).not.toHaveBeenCalled();
        expect(scope.missing).toEqual([]);
      });

      it('drops nothing and warns when the privilege check fails', async () => {
        const { esClient, hasPrivileges } = createEsClient({ resolved });
        hasPrivileges.mockRejectedValue(new Error('security is off'));

        const scope = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          indexPatterns,
          logger,
        });

        expect(scope.status).toBe('ok');
        expect(scope.index_patterns).toEqual(indexPatterns);
        expect(scope.missing).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('security is off'));
      });

      it('is blocked:empty_universe when the only positive entry is unreadable', async () => {
        const { esClient, fieldCapsFn } = createEsClient({
          resolved: resolveResponse({ indices: ['custom-meta-1'] }),
          unreadable: ['custom-meta-1'],
        });

        const scope = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          indexPatterns: ['custom-meta-1', '-logs-x*'],
        });

        expect(scope).toEqual(
          expect.objectContaining({
            status: 'blocked',
            resolution: 'blocked:empty_universe',
            index_patterns: [],
            missing: ['custom-meta-1'],
          })
        );
        expect(fieldCapsFn).not.toHaveBeenCalled();
      });
    });

    it('keeps exclusions through the pruning', async () => {
      const result = await run(
        ['logs-*', 'custom-1', '-logs-foo*'],
        resolveResponse({ dataStreams: ['logs-okta.system-default'] })
      ).scope;

      expect(result.index_patterns).toEqual(['logs-*', '-logs-foo*']);
    });
  });

  it('stops after the resolve and read checks when asked to resolve only', async () => {
    const env = createEsClient({
      resolved: resolveResponse({ dataStreams: ['logs-okta.system-default'] }),
    });

    const scope = await resolveHuntScope({
      esClient: env.esClient,
      spaceId: SPACE_ID,
      indexPatterns: ['logs-*', 'custom-edr-1'],
      resolveOnly: true,
    });

    expect(scope).toMatchObject({
      status: 'ok',
      index_patterns: ['logs-*'],
      missing: ['custom-edr-1'],
      discovered: [],
      actionable_indices: [],
    });
    expect(env.fieldCapsFn).not.toHaveBeenCalled();
  });
});
