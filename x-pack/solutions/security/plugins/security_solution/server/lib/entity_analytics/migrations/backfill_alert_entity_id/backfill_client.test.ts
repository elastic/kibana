/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import {
  BackfillRequestFailedError,
  buildBackfillQuery,
  buildUnstampedAlertsQuery,
  cancelBackfill,
  pollBackfill,
  resolveTargetIndices,
  startBackfill,
} from './backfill_client';
import { ALERT_ENTITY_ID } from '../../../../../common/field_maps/field_names';

const SIGNAL = new AbortController().signal;
const WINDOW = { start: '2026-09-08T00:00:00.000Z', end: '2026-10-08T00:00:00.000Z' };
const USABLE = new Set(['index-1']);
const ALERTS_INDEX = '.alerts-security.alerts-default';
const MAX_DOCS = 250_000;

describe('buildBackfillQuery', () => {
  it('restricts the search to indices that can be written to', () => {
    // Alerts are `dynamic: false`, so a write to an index without the mapping would succeed and be
    // invisible to scoring.
    const query = buildBackfillQuery(WINDOW, USABLE);

    expect(query.bool?.filter).toContainEqual({ terms: { _index: ['index-1'] } });
  });

  it('counts alerts in every index, including ones it cannot write to', () => {
    const query = buildUnstampedAlertsQuery(WINDOW);

    expect(query.bool?.filter).not.toContainEqual({ terms: { _index: ['index-1'] } });
    expect(query.bool?.must_not).toStrictEqual(buildBackfillQuery(WINDOW, USABLE).bool?.must_not);
  });

  it('skips alerts that are already stamped', () => {
    // What makes a pass self-limiting: every stamped alert leaves the result set for good.
    const query = buildBackfillQuery(WINDOW, USABLE);

    expect(query.bool?.must_not).toEqual([{ exists: { field: ALERT_ENTITY_ID } }]);
  });

  it('excludes alerts that could never produce an EUID', () => {
    // Without this clause the update-by-query walks alerts it can do nothing with.
    const query = buildBackfillQuery(WINDOW, USABLE);
    const derivability = (query.bool?.filter as Array<Record<string, unknown>>).find(
      (clause) => clause.bool !== undefined
    );

    expect(derivability).toMatchObject({ bool: { minimum_should_match: 1 } });
  });
});

describe('resolveTargetIndices', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  const mockIndices = ({
    mapped,
    settings,
  }: {
    mapped: Record<string, boolean>;
    settings: Record<string, Record<string, string>>;
  }) => {
    const mappedIndices = Object.keys(mapped).filter((index) => mapped[index]);
    const unmappedIndices = Object.keys(mapped).filter((index) => !mapped[index]);
    esClient.fieldCaps.mockResolvedValue({
      indices: Object.keys(mapped),
      fields:
        mappedIndices.length === 0
          ? {}
          : {
              [ALERT_ENTITY_ID]: {
                keyword: { type: 'keyword', searchable: true, aggregatable: true },
                ...(unmappedIndices.length > 0
                  ? {
                      unmapped: {
                        type: 'unmapped',
                        searchable: false,
                        aggregatable: false,
                        indices: unmappedIndices,
                      },
                    }
                  : {}),
              },
            },
    } as never);
    esClient.indices.getSettings.mockResolvedValue(
      Object.fromEntries(
        Object.entries(settings).map(([index, flat]) => [index, { settings: flat }])
      ) as never
    );
  };

  it('partitions indices into writable, read-only and unmapped', async () => {
    mockIndices({
      mapped: { blocked: true, unmapped: false, fine: true },
      settings: { blocked: { 'index.blocks.write': 'true' }, unmapped: {}, fine: {} },
    });

    const { usable, unusable } = await resolveTargetIndices({
      esClient,
      logger,
      alertsIndex: ALERTS_INDEX,
      signal: SIGNAL,
    });

    expect(usable).toEqual(new Set(['fine']));
    // Drives the distinction between "no alerts index yet" and "indices exist but all blocked".
    expect(unusable).toBe(2);
  });

  it('names the unmapped indices it skipped', async () => {
    mockIndices({ mapped: { 'index-1': false }, settings: { 'index-1': {} } });

    await resolveTargetIndices({ esClient, logger, alertsIndex: ALERTS_INDEX, signal: SIGNAL });

    const [[message]] = logger.warn.mock.calls;
    expect(message).toContain(ALERT_ENTITY_ID);
    expect(message).toContain('index-1');
  });

  it('treats every write block as read-only', async () => {
    // Flood-stage sets read_only_allow_delete specifically, so all three have to be checked.
    mockIndices({
      mapped: { a: true, b: true, c: true },
      settings: {
        a: { 'index.blocks.write': 'true' },
        b: { 'index.blocks.read_only': 'true' },
        c: { 'index.blocks.read_only_allow_delete': 'true' },
      },
    });

    const { usable, unusable } = await resolveTargetIndices({
      esClient,
      logger,
      alertsIndex: ALERTS_INDEX,
      signal: SIGNAL,
    });

    expect(usable.size).toBe(0);
    expect(unusable).toBe(3);
  });
});

describe('startBackfill', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const logger = loggerMock.create();

  const start = () =>
    startBackfill({
      esClient,
      logger,
      alertsIndex: ALERTS_INDEX,
      query: buildBackfillQuery(WINDOW, USABLE),
      alertsPerSecond: 500,
      maxDocs: MAX_DOCS,
      signal: SIGNAL,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.updateByQuery.mockResolvedValue({ task: 'node:123' } as never);
  });

  it('returns the Elasticsearch task running the request', async () => {
    await expect(start()).resolves.toBe('node:123');
  });

  it('does not wait for the request to finish', async () => {
    // A window of millions of alerts outlasts any Kibana task run, and the request keeps going in
    // Elasticsearch regardless of what this node does next.
    await start();

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ wait_for_completion: false }),
      expect.objectContaining({ signal: SIGNAL })
    );
  });

  it('submits once and lets a failed submit through, rather than retrying it', async () => {
    const connectionLost = new errors.ConnectionError('socket hang up');
    esClient.updateByQuery.mockRejectedValue(connectionLost);

    await expect(start()).rejects.toThrow(connectionLost);
    expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
  });

  it('throttles and tolerates concurrent modification', async () => {
    await start();

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ requests_per_second: 500, conflicts: 'proceed' }),
      expect.objectContaining({ signal: SIGNAL })
    );
  });

  it('caps how many alerts one request rewrites', async () => {
    // Bounds the transient disk growth of a single request; what is left over is picked up by the
    // next one, which the query already excludes what was stamped.
    await start();

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ max_docs: MAX_DOCS }),
      expect.objectContaining({ signal: SIGNAL })
    );
  });

  it('writes the EUIDs as a flat dotted key', async () => {
    // Alert _source stores kibana.alert.* flattened, matching the rule-execution enrichment.
    await start();

    const [[request]] = esClient.updateByQuery.mock.calls as unknown as Array<
      [{ script: { source: string } }]
    >;
    expect(request.script.source).toContain(`ctx._source['${ALERT_ENTITY_ID}'] = euids;`);
  });

  it('leaves alerts that resolve to no EUID untouched', async () => {
    await start();

    const [[request]] = esClient.updateByQuery.mock.calls as unknown as Array<
      [{ script: { source: string } }]
    >;
    expect(request.script.source).toContain("ctx.op = 'noop'");
  });
});

describe('cancelBackfill', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const logger = loggerMock.create();

  const cancel = () => cancelBackfill({ esClient, logger, esTaskId: 'node:123', signal: SIGNAL });

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('asks Elasticsearch to stop the request', async () => {
    await cancel();

    expect(esClient.tasks.cancel).toHaveBeenCalledWith(
      { task_id: 'node:123' },
      expect.objectContaining({ signal: SIGNAL })
    );
  });

  it('drops the stored result of the request it stopped', async () => {
    await cancel();

    expect(esClient.delete).toHaveBeenCalledWith({ index: '.tasks', id: 'node:123' });
  });

  it('does not throw when the request could not be stopped', async () => {
    esClient.tasks.cancel.mockRejectedValue(new Error('node left the cluster'));

    await expect(cancel()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('says nothing when the task has already gone', async () => {
    esClient.tasks.cancel.mockRejectedValue({ meta: { statusCode: 404 } });

    await expect(cancel()).resolves.toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('pollBackfill', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const logger = loggerMock.create();

  const poll = () => pollBackfill({ esClient, logger, esTaskId: 'node:123', signal: SIGNAL });

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('reports progress while the request is running', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: false,
      task: { status: { updated: 4200, total: 10_000 } },
    } as never);

    await expect(poll()).resolves.toMatchObject({
      completed: false,
      updated: 4200,
      total: 10_000,
    });
  });

  it('reports completion with the final count', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 9_000 } },
      response: { updated: 10_000, failures: [] },
    } as never);

    await expect(poll()).resolves.toMatchObject({ completed: true, updated: 10_000 });
  });

  it('surfaces failures the request reported', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 1 } },
      response: { failures: [{ cause: { type: 'mapper_parsing_exception' } }] },
    } as never);

    const { failures } = await poll();

    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('mapper_parsing_exception');
  });

  it('drops the stored result once the request has finished', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 10 } },
      response: { failures: [] },
    } as never);

    await poll();

    expect(esClient.delete).toHaveBeenCalledWith({ index: '.tasks', id: 'node:123' });
  });

  it('drops the stored result of a request that failed', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 0 } },
      error: { type: 'script_exception', reason: 'compile error' },
    } as never);

    await expect(poll()).rejects.toThrow(BackfillRequestFailedError);
    expect(esClient.delete).toHaveBeenCalledWith({ index: '.tasks', id: 'node:123' });
  });

  it('keeps the result of a request still running', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: false,
      task: { status: { updated: 4200, total: 10_000 } },
    } as never);

    await poll();

    expect(esClient.delete).not.toHaveBeenCalled();
  });

  it('reports a result it was not allowed to delete, without failing the poll', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 10 } },
      response: { updated: 10, failures: [] },
    } as never);
    esClient.delete.mockRejectedValue(new errors.ResponseError({ statusCode: 403 } as never));

    await expect(poll()).resolves.toMatchObject({ completed: true, updated: 10 });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('says nothing when the result has already gone', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 10 } },
      response: { failures: [] },
    } as never);
    esClient.delete.mockRejectedValue({ meta: { statusCode: 404 } });

    await poll();

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reports a vanished task rather than treating it as finished', async () => {
    // The node running it restarted, or someone cancelled it. Alerts it had not reached are still
    // unstamped, so the request has to be reissued rather than the space marked done.
    esClient.tasks.get.mockRejectedValue({ meta: { statusCode: 404 } });

    await expect(poll()).resolves.toMatchObject({ vanished: true, completed: false });
  });

  it('throws when Elasticsearch failed the request rather than finishing it', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 4200, total: 10_000 } },
      error: { type: 'script_exception', reason: 'compile error' },
    } as never);

    await expect(poll()).rejects.toThrow(BackfillRequestFailedError);
    await expect(poll()).rejects.toThrow('script_exception - compile error');
    await expect(poll()).rejects.toMatchObject({ updated: 4200 });
  });

  it('reports a search that timed out, which completion alone does not show', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 120, total: 10_000 } },
      response: { timed_out: true, failures: [] },
    } as never);

    await expect(poll()).resolves.toMatchObject({ completed: true, timedOut: true });
  });

  it('reports the alerts it passed over and the retries the cluster made it do', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 900 } },
      response: { noops: 95, retries: { bulk: 3, search: 0 }, failures: [] },
    } as never);

    await expect(poll()).resolves.toMatchObject({ noops: 95, bulkRetries: 3 });
  });

  it('reports alerts another writer held', async () => {
    // `conflicts: proceed` skips those rather than failing, so the count is the only trace of them.
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { updated: 4200, version_conflicts: 7 } },
      response: { updated: 4200, version_conflicts: 7, failures: [] },
    } as never);

    await expect(poll()).resolves.toMatchObject({ updated: 4200, versionConflicts: 7 });
  });

  it('rethrows anything that is not a missing task', async () => {
    esClient.tasks.get.mockRejectedValue({ meta: { statusCode: 500 } });

    await expect(poll()).rejects.toBeDefined();
  });
});
