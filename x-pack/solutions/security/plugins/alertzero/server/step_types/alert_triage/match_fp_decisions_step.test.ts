/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { TRIAGE_DECISIONS_AI_INDEX_DEST } from '../../../common/step_types/triage_decisions_index';
import {
  ALERT_FETCH_LIMIT,
  DECISION_MATCH_TOTAL_BUDGET_MS,
  DECISION_MATCH_WORK_BUDGET_MS,
  DECISION_NOTES_PER_SWEEP,
  NOTE_CONCURRENCY,
  TAG_CHUNK_SIZE,
  type DecisionAutoCloseMode,
} from '../../alert_triage/constants';
import { decisionId, groupByStrictKey, strictKeyTag } from '../../alert_triage/fp_decisions';
import { getTriageMatchFpDecisionsStepDefinition } from './match_fp_decisions_step';

const NOW = Date.parse('2026-10-27T12:00:00.000Z');

// A file alert: its key is the path and the process that wrote it, and carries the file hash. A
// process key is only held in shadow, so the fixture that stands for "a match `on` acts on" is a file.
const source = (path: string, severity = 'low') => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.revision': 3,
  'kibana.alert.severity': severity,
  host: { os: { type: 'windows' } },
  file: { path, hash: { sha256: 'cd'.repeat(32) } },
  process: { executable: 'C:\\writer.exe' },
});

const hashOf = (path: string) =>
  groupByStrictKey({ alerts: [{ id: 'x', doc: source(path) }], spaceId: 'default' }).groups[0].hash;

const stored = (kind: 'false_positive' | 'do_not_propose', expiresAt = NOW + 86_400_000) => ({
  type: 'security.fp_decision',
  expires_at: new Date(expiresAt).toISOString(),
  attributes: {
    decision: kind,
    approver: 'ana',
    decided_at: '2026-10-20T08:00:00.000Z',
    proposal_id: 'prop-1',
  },
});

const setup = ({
  alerts,
  decisions = {},
  mode = 'shadow',
  enabled = true,
  mgetError,
  unreadable = [],
  missingIndex = false,
  searchError,
  closedToday = 0,
  countError,
  closeError,
  noteError,
  movedOn = [],
  revokedDuringSweep = [],
  getError,
  runSpace = 'default',
  closeTimedOut = false,
  acknowledgedEarly = [],
  acknowledgedDuringTag = [],
  revokedAfterWrite = [],
  expiredAfterWrite = [],
  unreadableAfterWrite = [],
  conflictingVerdicts = [],
}: {
  alerts: Array<[string, Record<string, unknown>]>;
  /** Stored decisions by document id. */
  decisions?: Record<string, Record<string, unknown>>;
  mode?: DecisionAutoCloseMode;
  enabled?: boolean;
  mgetError?: Error & { statusCode?: number };
  /** Decision ids the `mget` answers with a per-document error, inside an HTTP 200. */
  unreadable?: string[];
  /** The decisions index does not exist: `mget` answers 200 with `index_not_found_exception` per document. */
  missingIndex?: boolean;
  searchError?: Error;
  closedToday?: number;
  countError?: Error;
  closeError?: Error;
  noteError?: Error;
  /** Alerts an analyst acknowledged after the search: the close leaves them alone. */
  movedOn?: string[];
  /** Decisions an analyst revokes after the sweep read them, before it acts on them. */
  revokedDuringSweep?: string[];
  /** Fails the re-read of a decision made just before acting on it. */
  getError?: Error & { statusCode?: number };
  /** The space of the workflow run. */
  runSpace?: string;
  /** The status route answers 200 but its update-by-query timed out part way. */
  closeTimedOut?: boolean;
  /** Alerts an analyst acknowledged after the search but before the sweep's own check, so the check sees them as not open. */
  acknowledgedEarly?: string[];
  /** Alerts an analyst acknowledged between the sweep's check and its dismissal tag write. */
  acknowledgedDuringTag?: string[];
  /** Decisions a revoke deletes after the sweep has written to their alerts: the first read still finds them in force. */
  revokedAfterWrite?: string[];
  /** Decisions that expire after the sweep has written to their alerts. */
  expiredAfterWrite?: string[];
  /** Decisions whose read after the sweep's writes fails. */
  unreadableAfterWrite?: string[];
  /** Decisions whose key has a true positive or inconclusive verdict. */
  conflictingVerdicts?: string[];
}) => {
  const skipTagged = new Set<string>();
  const callKibanaApi = jest.fn(
    async ({ path, body }: { path: string; body?: Record<string, any> }) => {
      if (path.endsWith('/signals/search')) {
        if (body?.aggs) {
          return {
            body: {
              aggregations: {
                keys: {
                  buckets: conflictingVerdicts.map((id) => ({
                    key: strictKeyTag(id.slice('fp-decision-'.length)),
                  })),
                },
              },
            },
          };
        }
        if (body?.size === 0) {
          if (countError) throw countError;
          return { body: { hits: { total: { value: closedToday } } } };
        }
        if (searchError) throw searchError;
        // The lookup of alerts that are still open: after a failed close all of them, after a close
        // that left some alone only those an analyst moved on from.
        // The check of which alerts are `open`, before a close or around a dismissal tag write.
        if (body?.query?.bool?.filter?.[1]?.term?.['kibana.alert.workflow_status'] === 'open') {
          const ids: string[] = body.query.bool.filter[0].ids.values;
          const gone = [
            ...acknowledgedEarly,
            ...(ids.every((id) => skipTagged.has(id)) ? acknowledgedDuringTag : []),
          ];
          return {
            body: {
              hits: { hits: ids.filter((_id) => !gone.includes(_id)).map((_id) => ({ _id })) },
            },
          };
        }
        if (body?.query?.bool?.filter?.[0]?.ids) {
          const open = closeError ? body.query.bool.filter[0].ids.values : movedOn;
          return { body: { hits: { hits: open.map((_id: string) => ({ _id })) } } };
        }
        return { body: { hits: { hits: alerts.map(([_id, _source]) => ({ _id, _source })) } } };
      }
      if (path.endsWith('/api/note')) {
        if (noteError) throw noteError;
        return { body: {} };
      }
      if (path.endsWith('/signals/status')) {
        if (closeError) throw closeError;
        const ids: string[] = body?.query.bool.filter[0].ids.values;
        return {
          body: {
            updated: ids.filter((id) => !movedOn.includes(id)).length,
            timed_out: closeTimedOut,
            failures: [],
          },
        };
      }
      if (path.endsWith('/signals/tags')) {
        const { ids, tags: change } = body as {
          ids: string[];
          tags: { tags_to_add: string[]; tags_to_remove: string[] };
        };
        if (change.tags_to_add.some((tag) => tag.startsWith('az:skipped_by_decision:'))) {
          ids.forEach((id) => skipTagged.add(id));
        }
      }
      return { body: { updated: 1, timed_out: false, failures: [] } };
    }
  );
  const mget = jest.fn(async ({ ids }: { ids: string[] }) => {
    if (mgetError) throw mgetError;
    return {
      docs: ids.map((_id) =>
        missingIndex
          ? { _id, error: { type: 'index_not_found_exception', reason: 'no such index' } }
          : unreadable.includes(_id)
          ? { _id, error: { type: 'no_shard_available_action_exception', reason: 'shard down' } }
          : { _id, found: decisions[_id] !== undefined, _source: decisions[_id] }
      ),
    };
  });
  const reads = new Map<string, number>();
  const get = jest.fn(async ({ id }: { id: string }) => {
    if (getError) throw getError;
    const current = decisions[id];
    if (current === undefined) throw Object.assign(new Error('not found'), { statusCode: 404 });
    reads.set(id, (reads.get(id) ?? 0) + 1);
    const afterWrite = reads.get(id)! > 1;
    if (afterWrite && unreadableAfterWrite.includes(id)) throw new Error('es down');
    const deleted = { ...current, governance: { lifecycle: { status: 'deleted' } } };
    const expired = { ...current, expires_at: new Date(NOW - 1000).toISOString() };
    return {
      _source:
        revokedDuringSweep.includes(id) || (afterWrite && revokedAfterWrite.includes(id))
          ? deleted
          : afterWrite && expiredAfterWrite.includes(id)
          ? expired
          : current,
    };
  });
  const run = () =>
    getTriageMatchFpDecisionsStepDefinition({
      isContextEngineEnabled: async () => enabled,
      getMode: async () => mode,
    }).handler({
      input: {
        analysis_tag_prefix: 'alert_analysis:',
        lookback_hours: 24,
        min_severity: 'low',
        exclude_building_blocks: false,
        excluded_rule_tags: [],
      },
      contextManager: {
        callKibanaApi,
        getContext: () => ({ workflow: { spaceId: runSpace } }),
        getFakeRequest: () => ({}),
        getScopedEsClient: () => ({ mget, get }),
      },
      logger: { warn: jest.fn(), info: jest.fn() },
    } as unknown as StepHandlerContext<unknown, unknown>);
  const closes = () =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith('/signals/status'))
      .map(([{ body }]) => {
        const { query, status, reason } = body as Record<string, any>;
        return {
          signal_ids: query.bool.filter[0].ids.values as string[],
          status: status as string,
          reason: reason as string,
          onlyIfStatus: query.bool.filter[1].term['kibana.alert.workflow_status'] as string,
        };
      });
  const tags = () =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith('/signals/tags'))
      .map(
        ([{ body }]) =>
          body as { ids: string[]; tags: { tags_to_add: string[]; tags_to_remove: string[] } }
      );
  const notes = () =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith('/api/note'))
      .map(
        ([{ body }]) =>
          (body as { note: { eventId: string; note: string; timelineId: string } }).note
      );
  return { run, callKibanaApi, mget, get, tags, closes, notes };
};

describe('triage match decisions step', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('tags the alerts of an approved pattern, and no others, with the decision id', async () => {
    const id = decisionId('false_positive', hashOf('C:\\Tools\\one.exe'));
    const { run, tags } = setup({
      alerts: [
        ['a', source('C:\\Tools\\one.exe')],
        ['b', source('C:\\Tools\\one.exe')],
        ['c', source('C:\\Tools\\two.exe')],
      ],
      decisions: { [id]: stored('false_positive') },
    });

    const { output } = await run();

    expect(output).toEqual(
      expect.objectContaining({
        status: 'ok',
        candidates: 3,
        decisions_matched: 1,
        would_close: 2,
        would_skip: 0,
      })
    );
    expect(tags()).toEqual([
      { ids: ['a', 'b'], tags: { tags_to_add: [`az:would_close:${id}`], tags_to_remove: [] } },
    ]);
  });

  it('reads decisions by their ids, from the index the decisions are written to', async () => {
    const { run, mget } = setup({ alerts: [['a', source('C:\\x.exe')]] });

    await run();

    expect(mget).toHaveBeenCalledWith({
      index: TRIAGE_DECISIONS_AI_INDEX_DEST.value,
      ids: [
        decisionId('false_positive', hashOf('C:\\x.exe')),
        decisionId('do_not_propose', hashOf('C:\\x.exe')),
      ],
    });
  });

  it("reads only the run's own space's decisions, so another space's decision never matches", async () => {
    const { run, mget, tags } = setup({
      alerts: [['a', source('C:\\x.exe')]],
      decisions: { [decisionId('false_positive', hashOf('C:\\x.exe'))]: stored('false_positive') },
      runSpace: 'team',
    });

    const { output } = await run();

    const teamHash = groupByStrictKey({
      alerts: [{ id: 'x', doc: source('C:\\x.exe') }],
      spaceId: 'team',
    }).groups[0].hash;
    expect(mget).toHaveBeenCalledWith({
      index: TRIAGE_DECISIONS_AI_INDEX_DEST.value,
      ids: [decisionId('false_positive', teamHash), decisionId('do_not_propose', teamHash)],
    });
    expect(output).toEqual(expect.objectContaining({ would_close: 0 }));
    expect(tags()).toEqual([]);
  });

  it('tags a dismissed pattern as would-skip', async () => {
    const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
    const { run, tags } = setup({
      alerts: [['a', source('C:\\x.exe')]],
      decisions: { [id]: stored('do_not_propose') },
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ would_skip: 1, would_close: 0 }));
    expect(tags()[0].tags.tags_to_add).toEqual([`az:would_skip:${id}`]);
  });

  it('ignores an expired decision', async () => {
    const id = decisionId('false_positive', hashOf('C:\\x.exe'));
    const { run, tags } = setup({
      alerts: [['a', source('C:\\x.exe')]],
      decisions: { [id]: stored('false_positive', NOW - 1) },
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ status: 'ok', would_close: 0 }));
    expect(tags()).toEqual([]);
  });

  it('leaves high and critical alerts untagged and counts them', async () => {
    const id = decisionId('false_positive', hashOf('C:\\x.exe'));
    const { run, tags } = setup({
      alerts: [
        ['a', source('C:\\x.exe', 'high')],
        ['b', source('C:\\x.exe', 'medium')],
      ],
      decisions: { [id]: stored('false_positive') },
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ would_close: 1, excluded_by_severity: 1 }));
    expect(tags()[0].ids).toEqual(['b']);
  });

  it('keeps an alert with no known severity with a human', async () => {
    const id = decisionId('false_positive', hashOf('C:\\x.exe'));
    const { 'kibana.alert.severity': _severity, ...unknown } = source('C:\\x.exe');
    const { run, tags } = setup({
      alerts: [['a', unknown]],
      decisions: { [id]: stored('false_positive') },
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ would_close: 0, excluded_by_severity: 1 }));
    expect(tags()).toEqual([]);
  });

  it('matches an alert that only shows up on a later page', async () => {
    const id = decisionId('false_positive', hashOf('C:\\x.exe'));
    const filler = Array.from({ length: ALERT_FETCH_LIMIT }, (_unused, i) => ({
      _id: `old${i}`,
      _source: source(`C:\\other${i}.exe`),
      sort: [i, `u${i}`],
    }));
    const { run, callKibanaApi, tags } = setup({
      alerts: [],
      decisions: { [id]: stored('false_positive') },
    });
    const pages = [filler, [{ _id: 'late', _source: source('C:\\x.exe'), sort: [1, 'z'] }]];
    callKibanaApi.mockImplementation(async ({ path }: { path: string }) =>
      path.endsWith('/signals/search')
        ? { body: { hits: { hits: pages.shift() ?? [] } } }
        : { body: { updated: 1, timed_out: false, failures: [] } }
    );

    const { output } = await run();

    expect(output).toEqual(
      expect.objectContaining({ candidates: ALERT_FETCH_LIMIT + 1, would_close: 1 })
    );
    expect(tags()[0].ids).toEqual(['late']);
    // The alerts route drops `search_after`, so the next page is read from the last timestamp on,
    // without the ids already read at it.
    const next = callKibanaApi.mock.calls[1][0].body!;
    expect(next.search_after).toBeUndefined();
    expect(JSON.stringify(next.query)).toContain(
      JSON.stringify({
        range: { '@timestamp': { gte: ALERT_FETCH_LIMIT - 1, format: 'epoch_millis' } },
      })
    );
    expect(JSON.stringify(next.query)).toContain(
      JSON.stringify({ ids: { values: [`old${ALERT_FETCH_LIMIT - 1}`] } })
    );
  });

  it('keeps the closes and the notes of earlier pages when a later page cannot be read', async () => {
    const id = decisionId('false_positive', hashOf('C:\\x.exe'));
    const first = [
      { _id: 'a', _source: source('C:\\x.exe'), sort: [1, 'a'] },
      ...Array.from({ length: ALERT_FETCH_LIMIT - 1 }, (_unused, i) => ({
        _id: `old${i}`,
        _source: source(`C:\\other${i}.exe`),
        sort: [i + 2, `u${i}`],
      })),
    ];
    const { run, callKibanaApi, closes, notes } = setup({
      mode: 'on',
      alerts: [],
      decisions: { [id]: stored('false_positive') },
    });
    let searches = 0;
    const inner = callKibanaApi.getMockImplementation()!;
    callKibanaApi.mockImplementation(
      async (params: { path: string; body?: Record<string, any> }) => {
        // Only the candidate searches: the checks of single alerts have an id filter.
        if (
          params.path.endsWith('/signals/search') &&
          params.body?.size !== 0 &&
          !params.body?.query?.bool?.filter?.[0]?.ids
        ) {
          if (++searches > 1) throw new Error('es down');
          return { body: { hits: { hits: first } } };
        }
        return inner(params);
      }
    );

    const { output } = await run();

    expect(closes().flatMap(({ signal_ids: ids }) => ids)).toEqual(['a']);
    expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
    expect(output).toEqual(
      expect.objectContaining({ status: 'failed', closed: 1, candidates: ALERT_FETCH_LIMIT })
    );
  });

  it.each([
    ['the kill switch is off', { mode: 'off' as const }, 'off'],
    ['the Context Engine is off in the space', { enabled: false }, 'disabled'],
  ])('does nothing, without any read, when %s', async (_name, settings, status) => {
    const { run, callKibanaApi, mget } = setup({
      alerts: [['a', source('C:\\x.exe')]],
      ...settings,
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ status }));
    expect(callKibanaApi).not.toHaveBeenCalled();
    expect(mget).not.toHaveBeenCalled();
  });

  it.each([
    ['an error on each document, as Elasticsearch answers', { missingIndex: true }],
    [
      'a thrown 404',
      { mgetError: Object.assign(new Error('index_not_found'), { statusCode: 404 }) },
    ],
  ])(
    'treats a missing decisions index (%s) as no decisions, not as a failure',
    async (_name, missing) => {
      const { run, tags } = setup({ alerts: [['a', source('C:\\x.exe')]], ...missing });

      const { output } = await run();

      expect(output).toEqual(
        expect.objectContaining({ status: 'ok', candidates: 1, would_close: 0 })
      );
      expect(tags()).toEqual([]);
    }
  );

  it('acts on no match when one decision document cannot be read, so an unread dismissal cannot let its approval close alerts', async () => {
    const hash = hashOf('C:\\x.exe');
    const { run, tags, closes } = setup({
      mode: 'on',
      alerts: [['a', source('C:\\x.exe')]],
      decisions: {
        [decisionId('false_positive', hash)]: stored('false_positive'),
        [decisionId('do_not_propose', hash)]: stored('do_not_propose'),
      },
      unreadable: [decisionId('do_not_propose', hash)],
    });

    const { output } = await run();

    expect(output).toEqual(
      expect.objectContaining({ status: 'failed', would_close: 0, closed: 0, skipped: 0 })
    );
    expect(tags()).toEqual([]);
    expect(closes()).toEqual([]);
  });

  it.each([
    ['the alert search', { searchError: new Error('es down') }],
    ['the decision read', { mgetError: new Error('es down') }],
  ])(
    'fails open when %s fails: nothing is tagged and the sweep goes on',
    async (_name, failure) => {
      const { run, tags } = setup({ alerts: [['a', source('C:\\x.exe')]], ...failure });

      const { output } = await run();

      expect(output).toEqual(expect.objectContaining({ status: 'failed', would_close: 0 }));
      expect(tags()).toEqual([]);
    }
  );

  it('counts a failed tag update and keeps tagging the other decisions', async () => {
    const one = decisionId('false_positive', hashOf('C:\\one.exe'));
    const two = decisionId('false_positive', hashOf('C:\\two.exe'));
    const { run, callKibanaApi } = setup({
      alerts: [
        ['a', source('C:\\one.exe')],
        ['b', source('C:\\two.exe')],
      ],
      decisions: { [one]: stored('false_positive'), [two]: stored('false_positive') },
    });
    callKibanaApi.mockImplementation(async ({ path, body }: any) => {
      if (path.endsWith('/signals/search')) {
        return {
          body: {
            hits: {
              hits: [
                { _id: 'a', _source: source('C:\\one.exe') },
                { _id: 'b', _source: source('C:\\two.exe') },
              ],
            },
          },
        };
      }
      if (body.ids[0] === 'a') throw new Error('tag failed');
      return { body: { updated: 1, timed_out: false, failures: [] } };
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ status: 'ok', tag_failures: 1 }));
    expect(
      callKibanaApi.mock.calls.filter(([{ path }]) => path.endsWith('/signals/tags'))
    ).toHaveLength(2);
  });

  it('asks only for the untriaged alerts of the look-back that no decision tagged yet', async () => {
    const { run, callKibanaApi } = setup({ alerts: [] });

    await run();

    const body = callKibanaApi.mock.calls[0][0].body!;
    const mustNot = JSON.stringify(body.query.bool.must_not);
    expect(mustNot).toContain('az:would_close:');
    expect(mustNot).toContain('az:would_skip:');
    expect(mustNot).toContain('az:true_positive');
    expect(JSON.stringify(body.query.bool.filter)).toContain('"gte":"2026-10-26T12:00:00.000Z"');
  });
});

describe('triage match decisions step in on mode', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  const approved = (executable: string) => ({
    [decisionId('false_positive', hashOf(executable))]: stored('false_positive'),
  });
  const idOf = (executable: string) => decisionId('false_positive', hashOf(executable));

  it('tags the alerts of an approved decision, then closes them as false positives, with no model', async () => {
    const { run, tags, closes, callKibanaApi } = setup({
      mode: 'on',
      alerts: [
        ['a', source('C:\\x.exe')],
        ['b', source('C:\\x.exe')],
        ['c', source('C:\\y.exe')],
      ],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    expect(output).toEqual(
      expect.objectContaining({ status: 'ok', would_close: 2, closed: 2, capped: 0 })
    );
    expect(tags()).toEqual([
      {
        ids: ['a', 'b'],
        tags: { tags_to_add: [`az:closed_by_decision:${idOf('C:\\x.exe')}`], tags_to_remove: [] },
      },
    ]);
    expect(closes()).toEqual([
      { signal_ids: ['a', 'b'], status: 'closed', reason: 'false_positive', onlyIfStatus: 'open' },
    ]);
    const paths = callKibanaApi.mock.calls.map(([{ path }]) => path.split('/').pop());
    expect(paths.indexOf('tags')).toBeLessThan(paths.indexOf('status'));
  });

  it('leaves shadow-tagged alerts to the normal path, so a held cloud match is read only once', async () => {
    // A held cloud match stays open and untriaged. Read again, it would come back at the front of
    // the oldest-first search every sweep and could fill the page limit. Alerts shadow tagged
    // before the switch to `on` go to analysis, as they would have in shadow.
    const { run, callKibanaApi } = setup({ mode: 'on', alerts: [] });

    await run();

    const search = callKibanaApi.mock.calls.find(([{ body }]) => body?.size !== 0)![0];
    expect(search.body!.query.bool.must_not).toEqual(
      expect.arrayContaining([
        { prefix: { 'kibana.alert.workflow_tags': 'az:would_close:' } },
        { prefix: { 'kibana.alert.workflow_tags': 'az:would_skip:' } },
      ])
    );
  });

  it('never closes high, critical or unknown severity alerts', async () => {
    const { 'kibana.alert.severity': _unknown, ...noSeverity } = source('C:\\x.exe');
    const { run, closes } = setup({
      mode: 'on',
      alerts: [
        ['a', source('C:\\x.exe', 'high')],
        ['b', source('C:\\x.exe', 'critical')],
        ['c', noSeverity],
      ],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ closed: 0, excluded_by_severity: 3 }));
    expect(closes()).toEqual([]);
  });

  it('closes only what is left of the daily cap and leaves the rest to the normal path', async () => {
    const { run, closes } = setup({
      mode: 'on',
      closedToday: 498,
      alerts: [
        ['a', source('C:\\x.exe')],
        ['b', source('C:\\x.exe')],
        ['c', source('C:\\x.exe')],
      ],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ closed: 2, capped: 1 }));
    expect(closes()[0].signal_ids).toEqual(['a', 'b']);
  });

  it('counts the closes of the last 24 hours against the daily cap', async () => {
    const { run, callKibanaApi } = setup({
      mode: 'on',
      alerts: [['a', source('C:\\x.exe')]],
      decisions: approved('C:\\x.exe'),
    });

    await run();

    const countBody = callKibanaApi.mock.calls
      .map(([{ body }]) => body as Record<string, any> | undefined)
      .find((body) => body?.size === 0 && !body.aggs);
    expect(
      countBody?.query.bool.filter[1].range['kibana.alert.workflow_status_updated_at'].gte
    ).toBe(new Date(NOW - 24 * 60 * 60 * 1000).toISOString());
  });

  it('closes nothing for a decision whose daily count cannot be read', async () => {
    const { run, closes, tags } = setup({
      mode: 'on',
      countError: new Error('es down'),
      alerts: [['a', source('C:\\x.exe')]],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ status: 'ok', closed: 0, close_failures: 1 }));
    expect(closes()).toEqual([]);
    expect(tags()).toEqual([]);
  });

  it('counts a close that fails and does not report those alerts as closed', async () => {
    const { run } = setup({
      mode: 'on',
      closeError: new Error('conflict'),
      alerts: [['a', source('C:\\x.exe')]],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ status: 'ok', closed: 0, close_failures: 1 }));
  });

  it('leaves an alert alone that an analyst acknowledged after the search, and takes its tag off', async () => {
    const { run, tags, notes } = setup({
      mode: 'on',
      movedOn: ['b'],
      alerts: [
        ['a', source('C:\\x.exe')],
        ['b', source('C:\\x.exe')],
      ],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    const tag = `az:closed_by_decision:${idOf('C:\\x.exe')}`;
    expect(output).toEqual(expect.objectContaining({ closed: 1, close_failures: 0 }));
    expect(tags().map(({ ids, tags: change }) => [ids, change])).toEqual([
      [['a', 'b'], { tags_to_add: [tag], tags_to_remove: [] }],
      [['b'], { tags_to_add: [], tags_to_remove: [tag] }],
    ]);
    expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
  });

  it('takes the tag off an alert an analyst closed for another reason, not only off one still open', async () => {
    const { run, callKibanaApi, tags, notes } = setup({
      mode: 'on',
      movedOn: ['b'],
      alerts: [
        ['a', source('C:\\x.exe')],
        ['b', source('C:\\x.exe')],
      ],
      decisions: approved('C:\\x.exe'),
    });

    await run();

    const lookup = callKibanaApi.mock.calls
      .map(([call]) => call.body)
      .find((body) => body?.query?.bool?.filter?.[0]?.ids && body.query.bool.must_not);
    expect(lookup?.query.bool.must_not).toEqual([
      {
        bool: {
          filter: [
            { term: { 'kibana.alert.workflow_status': 'closed' } },
            { term: { 'kibana.alert.workflow_reason': 'false_positive' } },
          ],
        },
      },
    ]);
    expect(tags().at(-1)?.ids).toEqual(['b']);
    expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
  });

  it('counts a close that failed against the daily allowance, so a later page cannot close another full allowance', async () => {
    const { run, callKibanaApi, closes } = setup({
      mode: 'on',
      closedToday: 498,
      closeError: new Error('partly applied'),
      alerts: [],
      decisions: approved('C:\\x.exe'),
    });
    const inner = callKibanaApi.getMockImplementation()!;
    const pages = [
      [
        ...['a', 'b'].map((_id, i) => ({ _id, _source: source('C:\\x.exe'), sort: [i, _id] })),
        ...Array.from({ length: ALERT_FETCH_LIMIT - 2 }, (_unused, i) => ({
          _id: `old${i}`,
          _source: source(`C:\\other${i}.exe`),
          sort: [i + 2, `u${i}`],
        })),
      ],
      [{ _id: 'late', _source: source('C:\\x.exe'), sort: [1, 'z'] }],
    ];
    callKibanaApi.mockImplementation(async (params: { path: string; body?: Record<string, any> }) =>
      params.path.endsWith('/signals/search') &&
      params.body?.size !== 0 &&
      !params.body?.query?.bool?.filter?.[0]?.ids
        ? { body: { hits: { hits: pages.shift() ?? [] } } }
        : inner(params)
    );

    const { output } = await run();

    // One attempt on the first page; the second page finds the allowance used up.
    expect(closes()).toHaveLength(1);
    expect(output).toEqual(expect.objectContaining({ close_failures: 1, capped: 1 }));
  });

  it('counts a close that timed out part way as a failure, and releases the alerts it did not reach', async () => {
    const { run, tags, notes } = setup({
      mode: 'on',
      movedOn: ['b'],
      closeTimedOut: true,
      alerts: [
        ['a', source('C:\\x.exe')],
        ['b', source('C:\\x.exe')],
      ],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ closed: 1, close_failures: 1 }));
    expect(tags().at(-1)).toEqual({
      ids: ['b'],
      tags: { tags_to_add: [], tags_to_remove: [`az:closed_by_decision:${idOf('C:\\x.exe')}`] },
    });
    expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
  });

  it('keeps the allowance a timed-out close used, since it may have closed more than it reports', async () => {
    const { run, callKibanaApi, closes } = setup({
      mode: 'on',
      closedToday: 498,
      movedOn: ['b'],
      closeTimedOut: true,
      alerts: [],
      decisions: approved('C:\\x.exe'),
    });
    const inner = callKibanaApi.getMockImplementation()!;
    const pages = [
      [
        ...['a', 'b'].map((_id, i) => ({ _id, _source: source('C:\\x.exe'), sort: [i, _id] })),
        ...Array.from({ length: ALERT_FETCH_LIMIT - 2 }, (_unused, i) => ({
          _id: `old${i}`,
          _source: source(`C:\\other${i}.exe`),
          sort: [i + 2, `u${i}`],
        })),
      ],
      [{ _id: 'late', _source: source('C:\\x.exe'), sort: [1, 'z'] }],
    ];
    callKibanaApi.mockImplementation(async (params: { path: string; body?: Record<string, any> }) =>
      params.path.endsWith('/signals/search') &&
      params.body?.size !== 0 &&
      !params.body?.query?.bool?.filter?.[0]?.ids
        ? { body: { hits: { hits: pages.shift() ?? [] } } }
        : inner(params)
    );

    const { output } = await run();

    // The close reported 1 of 2, but timed out, so the unused slot is not given back for 'late'.
    expect(closes()).toHaveLength(1);
    expect(output).toEqual(expect.objectContaining({ close_failures: 1, capped: 1 }));
  });

  it('takes the decision tag off alerts a failed close left open, so the next sweep retries them', async () => {
    const { run, tags } = setup({
      mode: 'on',
      closeError: new Error('conflict'),
      alerts: [['a', source('C:\\x.exe')]],
      decisions: approved('C:\\x.exe'),
    });

    await run();

    const tag = `az:closed_by_decision:${idOf('C:\\x.exe')}`;
    expect(tags().map(({ tags: change }) => change)).toEqual([
      { tags_to_add: [tag], tags_to_remove: [] },
      { tags_to_add: [], tags_to_remove: [tag] },
    ]);
  });

  it('closes nothing for a decision that was revoked after the sweep read it', async () => {
    const { run, tags, closes } = setup({
      mode: 'on',
      alerts: [['a', source('C:\\x.exe')]],
      decisions: approved('C:\\x.exe'),
      revokedDuringSweep: [idOf('C:\\x.exe')],
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ status: 'ok', would_close: 1, closed: 0 }));
    expect(tags()).toEqual([]);
    expect(closes()).toEqual([]);
  });

  it('keeps nothing out of analysis for a dismissal that was revoked after the sweep read it', async () => {
    const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
    const { run, tags } = setup({
      mode: 'on',
      alerts: [['a', source('C:\\x.exe')]],
      decisions: { [id]: stored('do_not_propose') },
      revokedDuringSweep: [id],
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ would_skip: 1, skipped: 0 }));
    expect(tags()).toEqual([]);
  });

  describe('what moves while the sweep writes', () => {
    const skipTag = (id: string) => `az:skipped_by_decision:${id}`;

    it('gives neither a close nor a note to an alert an analyst moved on before the close, and lets its tag go', async () => {
      const { run, tags, closes, notes } = setup({
        mode: 'on',
        acknowledgedEarly: ['b'],
        alerts: [
          ['a', source('C:\\x.exe')],
          ['b', source('C:\\x.exe')],
        ],
        decisions: approved('C:\\x.exe'),
      });

      const { output } = await run();

      const tag = `az:closed_by_decision:${idOf('C:\\x.exe')}`;
      expect(closes().map(({ signal_ids: ids }) => ids)).toEqual([['a']]);
      expect(tags().map(({ ids, tags: change }) => [ids, change])).toEqual([
        [['a', 'b'], { tags_to_add: [tag], tags_to_remove: [] }],
        [['b'], { tags_to_add: [], tags_to_remove: [tag] }],
      ]);
      expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
      expect(output).toEqual(expect.objectContaining({ closed: 1, close_failures: 0 }));
    });

    it('writes the dismissal tags only to alerts that are still open', async () => {
      const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
      const { run, tags, notes } = setup({
        mode: 'on',
        acknowledgedEarly: ['b'],
        alerts: [
          ['a', source('C:\\x.exe')],
          ['b', source('C:\\x.exe')],
        ],
        decisions: { [id]: stored('do_not_propose') },
      });

      const { output } = await run();

      expect(tags().map(({ ids }) => ids)).toEqual([['a']]);
      expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
      expect(output).toEqual(expect.objectContaining({ skipped: 1 }));
    });

    it('takes the dismissal tags off an alert an analyst acknowledged while they were written, so it is not kept out of analysis', async () => {
      const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
      const { run, tags, notes } = setup({
        mode: 'on',
        acknowledgedDuringTag: ['b'],
        alerts: [
          ['a', source('C:\\x.exe')],
          ['b', source('C:\\x.exe')],
        ],
        decisions: { [id]: stored('do_not_propose') },
      });

      const { output } = await run();

      expect(tags().map(({ ids, tags: change }) => [ids, change.tags_to_add.length])).toEqual([
        [['a', 'b'], 2],
        [['b'], 0],
      ]);
      expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
      expect(output).toEqual(expect.objectContaining({ skipped: 1 }));
    });

    it('undoes its closes when the decision was revoked while it closed, so the revoke is complete', async () => {
      const { run, tags, closes, notes } = setup({
        mode: 'on',
        alerts: [['a', source('C:\\x.exe')]],
        decisions: approved('C:\\x.exe'),
        revokedAfterWrite: [idOf('C:\\x.exe')],
      });

      const { output } = await run();

      const tag = `az:closed_by_decision:${idOf('C:\\x.exe')}`;
      expect(closes().map(({ status, signal_ids: ids }) => [status, ids])).toEqual([
        ['closed', ['a']],
        ['open', ['a']],
      ]);
      expect(tags().map(({ tags: change }) => change)).toEqual([
        { tags_to_add: [tag], tags_to_remove: [] },
        { tags_to_add: [], tags_to_remove: [tag] },
      ]);
      expect(notes()).toEqual([]);
      expect(output).toEqual(expect.objectContaining({ closed: 0, close_failures: 0 }));
    });

    it('takes the dismissal tags off when the decision was revoked while it tagged, and writes no note', async () => {
      const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
      const { run, tags, notes } = setup({
        mode: 'on',
        alerts: [['a', source('C:\\x.exe')]],
        decisions: { [id]: stored('do_not_propose') },
        revokedAfterWrite: [id],
      });

      const { output } = await run();

      expect(
        tags().map(({ tags: change }) => [change.tags_to_add.length, change.tags_to_remove])
      ).toEqual([
        [2, []],
        [0, ['az:inconclusive', skipTag(id)]],
      ]);
      expect(notes()).toEqual([]);
      expect(output).toEqual(expect.objectContaining({ skipped: 0 }));
    });
  });

  describe('when the sweep cannot finish a write cycle', () => {
    const dismissed = () => decisionId('do_not_propose', hashOf('C:\\x.exe'));

    it('keeps what it closed, and its notes, when the decision only expired after the closes', async () => {
      const { run, closes, tags, notes } = setup({
        mode: 'on',
        alerts: [['a', source('C:\\x.exe')]],
        decisions: approved('C:\\x.exe'),
        expiredAfterWrite: [idOf('C:\\x.exe')],
      });

      const { output } = await run();

      // An expiry is not a revoke: the closes were made while the decision was in force.
      expect(closes().map(({ status }) => status)).toEqual(['closed']);
      expect(tags()).toHaveLength(1);
      expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
      expect(output).toEqual(expect.objectContaining({ closed: 1 }));
    });

    it('keeps the dismissal tags and notes when the decision only expired after the tags', async () => {
      const id = dismissed();
      const { run, tags, notes } = setup({
        mode: 'on',
        alerts: [['a', source('C:\\x.exe')]],
        decisions: { [id]: stored('do_not_propose') },
        expiredAfterWrite: [id],
      });

      const { output } = await run();

      expect(tags()).toHaveLength(1);
      expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
      expect(output).toEqual(expect.objectContaining({ skipped: 1 }));
    });

    it('keeps what it closed and notes it when the decision cannot be read again', async () => {
      const { run, closes, notes } = setup({
        mode: 'on',
        alerts: [['a', source('C:\\x.exe')]],
        decisions: approved('C:\\x.exe'),
        unreadableAfterWrite: [idOf('C:\\x.exe')],
      });

      const { output } = await run();

      // The tag stays on the alert, so a revoke still finds it.
      expect(closes().map(({ status }) => status)).toEqual(['closed']);
      expect(notes().map(({ eventId }) => eventId)).toEqual(['a']);
      expect(output).toEqual(expect.objectContaining({ closed: 1 }));
    });

    it('counts a failure and writes no note when the undo of a revoked close fails', async () => {
      const { run, callKibanaApi, notes } = setup({
        mode: 'on',
        alerts: [['a', source('C:\\x.exe')]],
        decisions: approved('C:\\x.exe'),
        revokedAfterWrite: [idOf('C:\\x.exe')],
      });
      const inner = callKibanaApi.getMockImplementation()!;
      callKibanaApi.mockImplementation(
        async (params: { path: string; body?: Record<string, any> }) => {
          // The reopen is the status call that asks for `open`.
          if (params.path.endsWith('/signals/status') && params.body?.status === 'open') {
            throw new Error('reopen failed');
          }
          return inner(params);
        }
      );

      const { output } = await run();

      expect(notes()).toEqual([]);
      expect(output).toEqual(expect.objectContaining({ close_failures: 1 }));
    });

    it('puts back the alerts a failed close may have closed when the decision was revoked, since nothing else can find them', async () => {
      const { run, callKibanaApi, closes, tags, notes } = setup({
        mode: 'on',
        alerts: [['a', source('C:\\x.exe')]],
        decisions: approved('C:\\x.exe'),
        revokedAfterWrite: [idOf('C:\\x.exe')],
      });
      const inner = callKibanaApi.getMockImplementation()!;
      callKibanaApi.mockImplementation(
        async (params: { path: string; body?: Record<string, any> }) => {
          // The close is applied in part and then throws: the alert is closed, the sweep is not told.
          if (params.path.endsWith('/signals/status') && params.body?.status === 'closed') {
            throw new Error('close failed');
          }
          return inner(params);
        }
      );

      const { output } = await run();

      const tag = `az:closed_by_decision:${idOf('C:\\x.exe')}`;
      expect(closes().map(({ status, signal_ids: ids }) => [status, ids])).toEqual([
        ['closed', ['a']],
        ['open', ['a']],
      ]);
      expect(tags().at(-1)).toEqual({
        ids: ['a'],
        tags: { tags_to_add: [], tags_to_remove: [tag] },
      });
      expect(notes()).toEqual([]);
      expect(output).toEqual(expect.objectContaining({ closed: 0, close_failures: 1 }));
    });

    it('does not reopen an alert it released because an analyst moved it on, even if the analyst closed it as a false positive later', async () => {
      const { run, closes } = setup({
        mode: 'on',
        movedOn: ['b'],
        alerts: [
          ['a', source('C:\\x.exe')],
          ['b', source('C:\\x.exe')],
        ],
        decisions: approved('C:\\x.exe'),
        revokedAfterWrite: [idOf('C:\\x.exe')],
      });

      await run();

      // `b` was released when the close left it alone, so the rollback only reopens `a`.
      expect(closes().map(({ status, signal_ids: ids }) => [status, ids])).toEqual([
        ['closed', ['a', 'b']],
        ['open', ['a']],
      ]);
    });

    it('takes back from the total no more than the closes of the revoked decision, so other decisions keep theirs', async () => {
      const [idA, idB] = [idOf('C:\\a.exe'), idOf('C:\\b.exe')];
      const { run, callKibanaApi } = setup({
        mode: 'on',
        alerts: [
          ['a1', source('C:\\a.exe')],
          ['a2', source('C:\\a.exe')],
          ['b1', source('C:\\b.exe')],
          ['b2', source('C:\\b.exe')],
          ['b3', source('C:\\b.exe')],
        ],
        decisions: { ...approved('C:\\a.exe'), ...approved('C:\\b.exe') },
        revokedAfterWrite: [idB],
      });
      const inner = callKibanaApi.getMockImplementation()!;
      callKibanaApi.mockImplementation(
        async (params: { path: string; body?: Record<string, any> }) => {
          const { path, body } = params;
          // The close of decision B closes its alerts and then throws, so none of them is counted.
          if (
            path.endsWith('/signals/status') &&
            body?.status === 'closed' &&
            body.query.bool.filter[0].ids.values.includes('b1')
          ) {
            throw new Error('close failed');
          }
          return inner(params);
        }
      );

      const { output } = await run();

      expect(idA).not.toEqual(idB);
      // Decision A closed 2 alerts and keeps them. The 3 alerts B reopens were never counted.
      expect(output).toEqual(expect.objectContaining({ closed: 2, close_failures: 1 }));
    });

    it('takes the dismissal tags off a revoked decision in chunks, however many alerts it tagged', async () => {
      const id = dismissed();
      const ids = Array.from({ length: TAG_CHUNK_SIZE + 1 }, (_unused, i) => `s${i}`);
      const { run, tags, notes } = setup({
        mode: 'on',
        alerts: ids.map((alertId): [string, Record<string, unknown>] => [
          alertId,
          source('C:\\x.exe'),
        ]),
        decisions: { [id]: stored('do_not_propose') },
        revokedAfterWrite: [id],
      });

      const { output } = await run();

      const removals = tags().filter(({ tags: change }) => change.tags_to_add.length === 0);
      expect(removals.flatMap(({ ids: removed }) => removed)).toEqual(ids);
      expect(Math.max(...removals.map(({ ids: removed }) => removed.length))).toBeLessThanOrEqual(
        TAG_CHUNK_SIZE
      );
      expect(notes()).toEqual([]);
      expect(output).toEqual(expect.objectContaining({ skipped: 0 }));
    });

    it('does not count or note a revoked dismissal whose tags could not be taken off', async () => {
      const id = dismissed();
      const { run, callKibanaApi, notes } = setup({
        mode: 'on',
        alerts: [['a', source('C:\\x.exe')]],
        decisions: { [id]: stored('do_not_propose') },
        revokedAfterWrite: [id],
      });
      const inner = callKibanaApi.getMockImplementation()!;
      callKibanaApi.mockImplementation(
        async (params: { path: string; body?: Record<string, any> }) => {
          if (
            params.path.endsWith('/signals/tags') &&
            params.body?.tags.tags_to_add.length === 0 &&
            params.body?.tags.tags_to_remove.includes('az:inconclusive')
          ) {
            throw new Error('untag failed');
          }
          return inner(params);
        }
      );

      const { output } = await run();

      // A failed undo must not read as "kept out of analysis" for a decision that was taken back.
      expect(notes()).toEqual([]);
      expect(output).toEqual(expect.objectContaining({ skipped: 0, tag_failures: 1 }));
    });
  });

  it('reads the verdicts again for each page, so a verdict recorded after page one blocks the closes of page two', async () => {
    const first = [
      { _id: 'a', _source: source('C:\\x.exe'), sort: [1, 'a'] },
      ...Array.from({ length: ALERT_FETCH_LIMIT - 1 }, (_unused, i) => ({
        _id: `old${i}`,
        _source: source(`C:\\other${i}.exe`),
        sort: [i + 2, `u${i}`],
      })),
    ];
    const { run, callKibanaApi, closes, tags } = setup({
      mode: 'on',
      alerts: [],
      decisions: approved('C:\\x.exe'),
    });
    const inner = callKibanaApi.getMockImplementation()!;
    let pages = 0;
    let verdictReads = 0;
    callKibanaApi.mockImplementation(
      async (params: { path: string; body?: Record<string, any> }) => {
        const { path, body } = params;
        if (path.endsWith('/signals/search') && body?.aggs) {
          // No verdict when page one is read, one by the time page two is.
          const buckets = ++verdictReads > 1 ? [{ key: strictKeyTag(hashOf('C:\\x.exe')) }] : [];
          return { body: { aggregations: { keys: { buckets } } } };
        }
        if (
          path.endsWith('/signals/search') &&
          body?.size !== 0 &&
          !body?.query?.bool?.filter?.[0]?.ids
        ) {
          pages++;
          const hits =
            pages === 1 ? first : [{ _id: 'b', _source: source('C:\\x.exe'), sort: [20_000, 'b'] }];
          return { body: { hits: { hits } } };
        }
        return inner(params);
      }
    );

    const { output } = await run();

    expect(closes().flatMap(({ signal_ids: ids }) => ids)).toEqual(['a']);
    expect(tags()).toContainEqual({
      ids: ['b'],
      tags: { tags_to_add: [`az:would_close:${idOf('C:\\x.exe')}`], tags_to_remove: [] },
    });
    expect(output).toEqual(expect.objectContaining({ closed: 1, blocked_by_verdict: 1 }));
  });

  it('closes nothing for an approved decision whose key has a later true positive or inconclusive verdict', async () => {
    const { run, tags, closes, notes } = setup({
      mode: 'on',
      alerts: [
        ['a', source('C:\\x.exe')],
        ['b', source('C:\\x.exe')],
      ],
      decisions: approved('C:\\x.exe'),
      conflictingVerdicts: [idOf('C:\\x.exe')],
    });

    const { output } = await run();

    expect(closes()).toEqual([]);
    // Tagged as in shadow, so the shadow data still shows what the decision would have closed.
    expect(tags()).toEqual([
      {
        ids: ['a', 'b'],
        tags: { tags_to_add: [`az:would_close:${idOf('C:\\x.exe')}`], tags_to_remove: [] },
      },
    ]);
    expect(notes()).toEqual([]);
    expect(output).toEqual(
      expect.objectContaining({ closed: 0, blocked_by_verdict: 2, close_failures: 0 })
    );
  });

  it('closes nothing, and counts a failed close, when the decision cannot be read again', async () => {
    const { run, closes } = setup({
      mode: 'on',
      alerts: [['a', source('C:\\x.exe')]],
      decisions: approved('C:\\x.exe'),
      getError: Object.assign(new Error('unavailable'), { statusCode: 503 }),
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ closed: 0, close_failures: 1 }));
    expect(closes()).toEqual([]);
  });

  it('keeps the alerts of a dismissed pattern out of analysis and closes none', async () => {
    const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
    const { run, tags, closes } = setup({
      mode: 'on',
      alerts: [['a', source('C:\\x.exe', 'low')]],
      decisions: { [id]: stored('do_not_propose') },
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ would_skip: 1, skipped: 1, closed: 0 }));
    expect(tags()[0]).toEqual({
      ids: ['a'],
      tags: {
        tags_to_add: ['az:inconclusive', `az:skipped_by_decision:${id}`],
        tags_to_remove: [],
      },
    });
    expect(closes()).toEqual([]);
  });

  it('counts and notes the dismissal tags of the chunks before one that failed, since those alerts left analysis', async () => {
    const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
    const ids = Array.from({ length: TAG_CHUNK_SIZE + 100 }, (_unused, i) => `s${i}`);
    const { run, callKibanaApi, notes } = setup({
      mode: 'on',
      alerts: ids.map((alertId): [string, Record<string, unknown>] => [
        alertId,
        source('C:\\x.exe'),
      ]),
      decisions: { [id]: stored('do_not_propose') },
    });
    // The second chunk fails after it tagged its first 10 alerts.
    const partlyTagged = ids.slice(TAG_CHUNK_SIZE, TAG_CHUNK_SIZE + 10);
    const inner = callKibanaApi.getMockImplementation()!;
    callKibanaApi.mockImplementation(
      async (params: { path: string; body?: Record<string, any> }) => {
        if (
          params.path.endsWith('/signals/tags') &&
          params.body?.ids[0] === `s${TAG_CHUNK_SIZE}` &&
          params.body?.tags.tags_to_add.length > 0
        ) {
          throw new Error('tag failed');
        }
        const filter = params.body?.query?.bool?.filter;
        if (
          params.path.endsWith('/signals/search') &&
          filter?.[1]?.term?.['kibana.alert.workflow_tags']
        ) {
          expect(filter[1].term).toEqual({
            'kibana.alert.workflow_tags': `az:skipped_by_decision:${id}`,
          });
          return { body: { hits: { hits: partlyTagged.map((_id) => ({ _id })) } } };
        }
        return inner(params);
      }
    );

    const { output } = await run();

    expect(output).toEqual(
      expect.objectContaining({ skipped: TAG_CHUNK_SIZE, tag_failures: 1, notes_missing: 0 })
    );
    expect(notes().map(({ eventId }) => eventId)).toEqual(ids.slice(0, TAG_CHUNK_SIZE));
    // Only the alerts of the failed chunk that carry the skip tag lose the tags, so a verdict
    // another writer gave the rest of the chunk stays.
    expect(
      callKibanaApi.mock.calls
        .filter(([{ path }]) => path.endsWith('/signals/tags'))
        .map(([{ body }]) => body)
        .at(-1)
    ).toEqual({
      ids: partlyTagged,
      tags: {
        tags_to_add: [],
        tags_to_remove: ['az:inconclusive', `az:skipped_by_decision:${id}`],
      },
    });
  });

  describe('a signer in `on`', () => {
    // A library key keeps the signer's name and drops the hash, so only a trusted signer is acted on.
    // A process key is held whatever its signer or hash says: they name the binary, not what it did.
    const base = () => ({
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 3,
      'kibana.alert.severity': 'low',
      host: { os: { type: 'windows' } },
    });
    const signed = (trusted?: boolean) => ({
      ...base(),
      process: {
        executable: 'C:\\x.exe',
        code_signature: {
          subject_name: 'Acme',
          ...(trusted === undefined ? {} : { trusted }),
        },
      },
    });
    const unsigned = () => ({
      ...base(),
      process: { executable: 'C:\\x.exe', hash: { sha256: 'ab'.repeat(32) } },
    });
    const idFor = (doc: Record<string, unknown>) =>
      decisionId(
        'false_positive',
        groupByStrictKey({ alerts: [{ id: 'x', doc }], spaceId: 'default' }).groups[0].hash
      );

    it.each([
      ['not trusted', false],
      ['missing its trust flag', undefined],
    ])(
      'only tags a match whose signer is %s, so a forged certificate closes nothing',
      async (_label, trusted) => {
        const doc = signed(trusted);
        const id = idFor(doc);
        const { run, tags, closes } = setup({
          mode: 'on',
          alerts: [['u', doc]],
          decisions: { [id]: stored('false_positive') },
        });

        const { output } = await run();

        expect(closes()).toEqual([]);
        expect(tags()).toEqual([
          { ids: ['u'], tags: { tags_to_add: [`az:would_close:${id}`], tags_to_remove: [] } },
        ]);
        expect(output).toEqual(expect.objectContaining({ closed: 0, held_in_shadow: 1 }));
      }
    );

    it.each([
      [false, 0, 1],
      [true, 1, 0],
    ])(
      'reads the library signer trust from the dll: trusted %s closes %i and holds %i',
      async (trusted, closed, held) => {
        const doc = {
          ...base(),
          event: { category: ['library'] },
          dll: { path: 'C:\\lib\\a.dll', code_signature: { subject_name: 'Acme', trusted } },
        };
        const { run, closes } = setup({
          mode: 'on',
          alerts: [['l', doc]],
          decisions: { [idFor(doc)]: stored('false_positive') },
        });

        const { output } = await run();

        expect(closes()).toHaveLength(closed);
        expect(output).toEqual(expect.objectContaining({ closed, held_in_shadow: held }));
      }
    );

    // The process key leaves out the command line, so an approval for benign runs of a binary would
    // close alerts for other behavior of the same binary and parent.
    it.each([
      ['a trusted signer', () => signed(true)],
      ['an unsigned binary whose key carries the file hash', unsigned],
    ])(
      'only tags a process match on %s, because the key cannot tell the behavior apart',
      async (_label, build) => {
        const doc = build();
        const id = idFor(doc);
        const { run, tags, closes } = setup({
          mode: 'on',
          alerts: [['t', doc]],
          decisions: { [id]: stored('false_positive') },
        });

        const { output } = await run();

        expect(closes()).toEqual([]);
        expect(tags()).toEqual([
          { ids: ['t'], tags: { tags_to_add: [`az:would_close:${id}`], tags_to_remove: [] } },
        ]);
        expect(output).toEqual(expect.objectContaining({ closed: 0, held_in_shadow: 1 }));
      }
    );

    it('still acts on a file match, whose key carries the file hash', async () => {
      const doc = source('C:\\x.exe');
      const { run, closes } = setup({
        mode: 'on',
        alerts: [['h', doc]],
        decisions: { [idFor(doc)]: stored('false_positive') },
      });

      const { output } = await run();

      expect(closes().map(({ signal_ids }) => signal_ids)).toEqual([['h']]);
      expect(output).toEqual(expect.objectContaining({ closed: 1, held_in_shadow: 0 }));
    });

    // Such a key names only paths, so any binary put at an approved path would match it.
    it.each([
      ['an unsigned binary whose source sends no hash', { process: { executable: 'C:\\x.exe' } }],
      [
        'a registry key',
        {
          event: { category: ['registry'] },
          registry: { path: 'HKLM\\Software\\Acme\\Run' },
        },
      ],
      [
        'a file key with no hash',
        { event: { category: ['file'] }, file: { path: 'C:\\data\\a.txt' } },
      ],
    ])('only tags a match on %s, which has neither a signer nor a hash', async (_label, fields) => {
      const doc = { ...base(), process: { executable: 'C:\\x.exe' }, ...fields };
      const id = idFor(doc);
      const { run, tags, closes } = setup({
        mode: 'on',
        alerts: [['p', doc]],
        decisions: { [id]: stored('false_positive') },
      });

      const { output } = await run();

      expect(closes()).toEqual([]);
      expect(tags()).toEqual([
        { ids: ['p'], tags: { tags_to_add: [`az:would_close:${id}`], tags_to_remove: [] } },
      ]);
      expect(output).toEqual(expect.objectContaining({ closed: 0, held_in_shadow: 1 }));
    });
  });

  describe('a cloud key in `on`', () => {
    // A cloud key is the action plus the account, so it covers every actor of that action.
    const cloud = (action: string) => ({
      'kibana.alert.rule.uuid': 'rule-cloud',
      'kibana.alert.rule.revision': 1,
      'kibana.alert.severity': 'low',
      event: { action },
      cloud: { account: { id: '123456789012' } },
    });
    const cloudId = (kind: 'false_positive' | 'do_not_propose', action: string) =>
      decisionId(
        kind,
        groupByStrictKey({ alerts: [{ id: 'x', doc: cloud(action) }], spaceId: 'default' })
          .groups[0].hash
      );

    it('only tags an approved cloud match, as shadow does, while another kind still closes', async () => {
      const cloudDecision = cloudId('false_positive', 'AssumeRole');
      const fileDecision = decisionId('false_positive', hashOf('C:\\x.exe'));
      const { run, tags, closes } = setup({
        mode: 'on',
        alerts: [
          ['c', cloud('AssumeRole')],
          ['f', source('C:\\x.exe')],
        ],
        decisions: {
          [cloudDecision]: stored('false_positive'),
          [fileDecision]: stored('false_positive'),
        },
      });

      const { output } = await run();

      expect(closes().map(({ signal_ids }) => signal_ids)).toEqual([['f']]);
      expect(tags()).toContainEqual({
        ids: ['c'],
        tags: { tags_to_add: [`az:would_close:${cloudDecision}`], tags_to_remove: [] },
      });
      expect(tags().filter(({ ids }) => ids.includes('c'))).toHaveLength(1);
      expect(output).toEqual(
        expect.objectContaining({ would_close: 2, closed: 1, held_in_shadow: 1 })
      );
    });

    it('only tags a dismissed cloud match as would-skip, so it still goes to analysis', async () => {
      const id = cloudId('do_not_propose', 'AssumeRole');
      const { run, tags } = setup({
        mode: 'on',
        alerts: [['c', cloud('AssumeRole')]],
        decisions: { [id]: stored('do_not_propose') },
      });

      const { output } = await run();

      expect(tags()).toEqual([
        { ids: ['c'], tags: { tags_to_add: [`az:would_skip:${id}`], tags_to_remove: [] } },
      ]);
      expect(output).toEqual(
        expect.objectContaining({ would_skip: 1, skipped: 0, held_in_shadow: 1 })
      );
    });
  });

  it('sends a high alert of a dismissed pattern to analysis, because a dismissal is not a verdict that it is fine', async () => {
    const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
    const { run, tags } = setup({
      mode: 'on',
      alerts: [
        ['a', source('C:\\x.exe', 'high')],
        ['b', source('C:\\x.exe', 'low')],
      ],
      decisions: { [id]: stored('do_not_propose') },
    });

    const { output } = await run();

    expect(output).toEqual(
      expect.objectContaining({ would_skip: 1, skipped: 1, excluded_by_severity: 1 })
    );
    expect(tags()).toHaveLength(1);
    expect(tags()[0].ids).toEqual(['b']);
  });

  it('closes nothing in shadow mode', async () => {
    const { run, closes } = setup({
      mode: 'shadow',
      alerts: [['a', source('C:\\x.exe')]],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ would_close: 1, closed: 0 }));
    expect(closes()).toEqual([]);
  });

  it('writes a note on each closed alert that says which decision closed it, who approved it, and how to revoke it', async () => {
    const { run, notes } = setup({
      mode: 'on',
      alerts: [
        ['a', source('C:\\x.exe')],
        ['b', source('C:\\x.exe')],
      ],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    expect(notes().map(({ eventId }) => eventId)).toEqual(['a', 'b']);
    expect(notes()[0].timelineId).toBe('');
    expect(notes()[0].note).toContain(idOf('C:\\x.exe'));
    expect(notes()[0].note).toContain('approved by ana on 2026-10-20 (proposal prop-1)');
    expect(notes()[0].note).toContain('system-security-floor-alert-triage-revoke-decision');
    expect(output).toEqual(expect.objectContaining({ closed: 2, notes_missing: 0 }));
  });

  it('writes no note in shadow mode, where nothing is closed', async () => {
    const { run, notes } = setup({
      mode: 'shadow',
      alerts: [['a', source('C:\\x.exe')]],
      decisions: approved('C:\\x.exe'),
    });

    await run();

    expect(notes()).toEqual([]);
  });

  it('keeps the alerts closed when their notes cannot be written, and counts the missing notes', async () => {
    const { run } = setup({
      mode: 'on',
      noteError: new Error('notes down'),
      alerts: [
        ['a', source('C:\\x.exe')],
        ['b', source('C:\\x.exe')],
      ],
      decisions: approved('C:\\x.exe'),
    });

    const { output } = await run();

    expect(output).toEqual(
      expect.objectContaining({ closed: 2, close_failures: 0, notes_missing: 2 })
    );
  });

  it('writes a note on an alert a dismissed pattern kept out of analysis', async () => {
    const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
    const { run, notes } = setup({
      mode: 'on',
      alerts: [['a', source('C:\\x.exe')]],
      decisions: { [id]: stored('do_not_propose') },
    });

    await run();

    expect(notes()).toHaveLength(1);
    expect(notes()[0].note).toContain('Kept out of analysis');
    expect(notes()[0].note).toContain('dismissed by ana');
  });

  it('skips only as many alerts as the sweep has notes for, and leaves the rest untouched for the next sweep', async () => {
    const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
    const many = Array.from(
      { length: DECISION_NOTES_PER_SWEEP + 5 },
      (_unused, i): [string, Record<string, unknown>] => [`a${i}`, source('C:\\x.exe')]
    );
    const { run, notes, tags } = setup({
      mode: 'on',
      alerts: many,
      decisions: { [id]: stored('do_not_propose') },
    });

    const { output } = await run();

    expect(notes()).toHaveLength(DECISION_NOTES_PER_SWEEP);
    const tagged = tags().flatMap(({ ids }) => ids);
    expect(tagged).toHaveLength(DECISION_NOTES_PER_SWEEP);
    expect(tagged).not.toContain(`a${DECISION_NOTES_PER_SWEEP}`);
    expect(output).toEqual(
      expect.objectContaining({
        skipped: DECISION_NOTES_PER_SWEEP,
        left_for_notes: 5,
        notes_missing: 0,
      })
    );
  });

  it('closes only as many alerts as the notes the skips left, so no closed alert goes without a note', async () => {
    const skipId = decisionId('do_not_propose', hashOf('C:\\skip.exe'));
    const closeId = decisionId('false_positive', hashOf('C:\\close.exe'));
    const skips = DECISION_NOTES_PER_SWEEP - 200;
    const alerts = [
      ...Array.from({ length: skips }, (_unused, i): [string, Record<string, unknown>] => [
        `s${i}`,
        source('C:\\skip.exe'),
      ]),
      ...Array.from({ length: 300 }, (_unused, i): [string, Record<string, unknown>] => [
        `c${i}`,
        source('C:\\close.exe'),
      ]),
    ];
    const { run, notes, closes } = setup({
      mode: 'on',
      alerts,
      decisions: { [skipId]: stored('do_not_propose'), [closeId]: stored('false_positive') },
    });

    const { output } = await run();

    expect(closes().flatMap(({ signal_ids }) => signal_ids)).toHaveLength(200);
    expect(notes()).toHaveLength(DECISION_NOTES_PER_SWEEP);
    expect(output).toEqual(
      expect.objectContaining({
        skipped: skips,
        closed: 200,
        left_for_notes: 100,
        notes_missing: 0,
      })
    );
  });

  describe('time and volume', () => {
    const manyApproved = (count: number) => {
      const executables = Array.from({ length: count }, (_unused, i) => `C:\\x${i}.exe`);
      return {
        alerts: executables.map((executable, i): [string, Record<string, unknown>] => [
          `a${i}`,
          source(executable),
        ]),
        decisions: Object.assign({}, ...executables.map(approved)),
      };
    };

    it('writes the notes of all decisions in one pool, not one pool per decision', async () => {
      const { run, callKibanaApi, notes } = setup({ mode: 'on', ...manyApproved(30) });
      const original = callKibanaApi.getMockImplementation()!;
      let inFlight = 0;
      let peak = 0;
      callKibanaApi.mockImplementation(
        async (params: { path: string; body?: Record<string, any> }) => {
          if (!params.path.endsWith('/api/note')) return original(params);
          inFlight++;
          peak = Math.max(peak, inFlight);
          await Promise.resolve();
          await Promise.resolve();
          inFlight--;
          return original(params);
        }
      );

      const { output } = await run();

      expect(notes()).toHaveLength(30);
      expect(output).toEqual(expect.objectContaining({ closed: 30, notes_missing: 0 }));
      // Each decision has one alert, so only a shared pool can have more than one note in flight.
      expect(peak).toBeGreaterThan(1);
      expect(peak).toBeLessThanOrEqual(NOTE_CONCURRENCY);
    });

    it('starts no new decision once the work budget is spent, and leaves the rest for the next sweep', async () => {
      const { run, callKibanaApi, closes } = setup({ mode: 'on', ...manyApproved(3) });
      const original = callKibanaApi.getMockImplementation()!;
      callKibanaApi.mockImplementation(
        async (params: { path: string; body?: Record<string, any> }) => {
          const response = await original(params);
          if (params.path.endsWith('/signals/status')) {
            jest.setSystemTime(NOW + DECISION_MATCH_WORK_BUDGET_MS + 1);
          }
          return response;
        }
      );

      const { output } = await run();

      expect(closes()).toHaveLength(1);
      expect(output).toEqual(
        expect.objectContaining({ status: 'ok', closed: 1, deferred: 2, out_of_time: true })
      );
    });

    it('does not read the verdicts once the dismissals have used the work budget, and defers the closes', async () => {
      const dismissedId = decisionId('do_not_propose', hashOf('C:\\a.exe'));
      const { run, callKibanaApi, closes } = setup({
        mode: 'on',
        alerts: [
          ['d', source('C:\\a.exe')],
          ['f', source('C:\\b.exe')],
        ],
        decisions: { ...approved('C:\\b.exe'), [dismissedId]: stored('do_not_propose') },
      });
      const original = callKibanaApi.getMockImplementation()!;
      callKibanaApi.mockImplementation(
        async (params: { path: string; body?: Record<string, any> }) => {
          const response = await original(params);
          // The dismissal is written first; its write is the one that spends the work budget.
          if (params.path.endsWith('/signals/tags')) {
            jest.setSystemTime(NOW + DECISION_MATCH_WORK_BUDGET_MS + 1);
          }
          return response;
        }
      );

      const { output } = await run();

      const verdictSearches = callKibanaApi.mock.calls.filter(([{ body }]) => body?.aggs);
      expect(verdictSearches).toHaveLength(0);
      expect(closes()).toEqual([]);
      expect(output).toEqual(expect.objectContaining({ deferred: 1, out_of_time: true }));
    });

    it('still writes the notes of what it closed within the total budget', async () => {
      const { run, callKibanaApi, notes } = setup({ mode: 'on', ...manyApproved(3) });
      const original = callKibanaApi.getMockImplementation()!;
      callKibanaApi.mockImplementation(
        async (params: { path: string; body?: Record<string, any> }) => {
          const response = await original(params);
          if (params.path.endsWith('/signals/status')) {
            jest.setSystemTime(NOW + DECISION_MATCH_WORK_BUDGET_MS + 1);
          }
          return response;
        }
      );

      await run();

      expect(notes()).toHaveLength(1);
    });

    it('starts no note after the total budget, keeps what was closed, and counts the notes missing', async () => {
      const { run, callKibanaApi, notes } = setup({ mode: 'on', ...manyApproved(3) });
      const original = callKibanaApi.getMockImplementation()!;
      callKibanaApi.mockImplementation(
        async (params: { path: string; body?: Record<string, any> }) => {
          const response = await original(params);
          if (params.path.endsWith('/signals/status')) {
            jest.setSystemTime(NOW + DECISION_MATCH_TOTAL_BUDGET_MS + 1);
          }
          return response;
        }
      );

      const { output } = await run();

      expect(notes()).toHaveLength(0);
      expect(output).toEqual(expect.objectContaining({ closed: 1, notes_missing: 1, deferred: 2 }));
    });
  });
});
