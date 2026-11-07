/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { HUNT_COVERAGE_AI_INDEX_DEST } from '../../../common/step_types/package_report';
import {
  ALERT_FETCH_LIMIT,
  DECISION_MATCH_TOTAL_BUDGET_MS,
  DECISION_MATCH_WORK_BUDGET_MS,
  DECISION_NOTES_PER_SWEEP,
  NOTE_CONCURRENCY,
  type DecisionAutoCloseMode,
} from '../../alert_triage/constants';
import { decisionId, groupByStrictKey } from '../../alert_triage/fp_decisions';
import { getTriageMatchFpDecisionsStepDefinition } from './match_fp_decisions_step';

const NOW = Date.parse('2026-10-27T12:00:00.000Z');

const source = (executable: string, severity = 'low') => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.revision': 3,
  'kibana.alert.severity': severity,
  host: { os: { type: 'windows' } },
  process: { executable, code_signature: { subject_name: 'Acme' } },
});

const hashOf = (executable: string) =>
  groupByStrictKey({ alerts: [{ id: 'x', doc: source(executable) }], spaceId: 'default' }).groups[0]
    .hash;

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
  searchError,
  closedToday = 0,
  countError,
  closeError,
  noteError,
  movedOn = [],
}: {
  alerts: Array<[string, Record<string, unknown>]>;
  /** Stored decisions by document id. */
  decisions?: Record<string, Record<string, unknown>>;
  mode?: DecisionAutoCloseMode;
  enabled?: boolean;
  mgetError?: Error & { statusCode?: number };
  searchError?: Error;
  closedToday?: number;
  countError?: Error;
  closeError?: Error;
  noteError?: Error;
  /** Alerts an analyst acknowledged after the search: the close leaves them alone. */
  movedOn?: string[];
}) => {
  const callKibanaApi = jest.fn(
    async ({ path, body }: { path: string; body?: Record<string, any> }) => {
      if (path.endsWith('/signals/search')) {
        if (body?.size === 0) {
          if (countError) throw countError;
          return { body: { hits: { total: { value: closedToday } } } };
        }
        if (searchError) throw searchError;
        // The lookup of alerts that are still open: after a failed close all of them, after a close
        // that left some alone only those an analyst moved on from.
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
          body: { updated: ids.filter((id) => !movedOn.includes(id)).length, failures: [] },
        };
      }
      return { body: { updated: 1, timed_out: false, failures: [] } };
    }
  );
  const mget = jest.fn(async ({ ids }: { ids: string[] }) => {
    if (mgetError) throw mgetError;
    return {
      docs: ids.map((_id) => ({
        _id,
        found: decisions[_id] !== undefined,
        _source: decisions[_id],
      })),
    };
  });
  const run = () =>
    getTriageMatchFpDecisionsStepDefinition({
      isContextEngineEnabled: async () => enabled,
      getMode: async () => mode,
    }).handler({
      input: {
        space_id: 'default',
        analysis_tag_prefix: 'alert_analysis:',
        lookback_hours: 24,
        min_severity: 'low',
        exclude_building_blocks: false,
        excluded_rule_tags: [],
      },
      contextManager: {
        callKibanaApi,
        getFakeRequest: () => ({}),
        getScopedEsClient: () => ({ mget }),
      },
      logger: { warn: jest.fn() },
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
      .map(([{ body }]) => body as { ids: string[]; tags: { tags_to_add: string[] } });
  const notes = () =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith('/api/note'))
      .map(
        ([{ body }]) =>
          (body as { note: { eventId: string; note: string; timelineId: string } }).note
      );
  return { run, callKibanaApi, mget, tags, closes, notes };
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
      index: HUNT_COVERAGE_AI_INDEX_DEST.value,
      ids: [
        decisionId('false_positive', hashOf('C:\\x.exe')),
        decisionId('do_not_propose', hashOf('C:\\x.exe')),
      ],
    });
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
        if (params.path.endsWith('/signals/search') && params.body?.size !== 0) {
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

  it('does nothing when the kill switch is off, without any read', async () => {
    const { run, callKibanaApi, mget } = setup({
      alerts: [['a', source('C:\\x.exe')]],
      mode: 'off',
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ status: 'off' }));
    expect(callKibanaApi).not.toHaveBeenCalled();
    expect(mget).not.toHaveBeenCalled();
  });

  it('does nothing while the Context Engine is off in the space', async () => {
    const { run, callKibanaApi } = setup({ alerts: [['a', source('C:\\x.exe')]], enabled: false });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ status: 'disabled' }));
    expect(callKibanaApi).not.toHaveBeenCalled();
  });

  it('treats a missing decisions index as no decisions, not as a failure', async () => {
    const { run, tags } = setup({
      alerts: [['a', source('C:\\x.exe')]],
      mgetError: Object.assign(new Error('index_not_found'), { statusCode: 404 }),
    });

    const { output } = await run();

    expect(output).toEqual(
      expect.objectContaining({ status: 'ok', candidates: 1, would_close: 0 })
    );
    expect(tags()).toEqual([]);
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

  it('still matches the alerts that shadow tagged earlier', async () => {
    const { run, callKibanaApi } = setup({ mode: 'on', alerts: [] });

    await run();

    const search = callKibanaApi.mock.calls.find(([{ body }]) => body?.size !== 0)![0];
    expect(JSON.stringify(search.body!.query)).not.toContain('az:would_close:');
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

  it('stops writing notes past the sweep limit, and still keeps every alert out of analysis', async () => {
    const id = decisionId('do_not_propose', hashOf('C:\\x.exe'));
    const many = Array.from(
      { length: DECISION_NOTES_PER_SWEEP + 5 },
      (_unused, i): [string, Record<string, unknown>] => [`a${i}`, source('C:\\x.exe')]
    );
    const { run, notes } = setup({
      mode: 'on',
      alerts: many,
      decisions: { [id]: stored('do_not_propose') },
    });

    const { output } = await run();

    expect(notes()).toHaveLength(DECISION_NOTES_PER_SWEEP);
    expect(output).toEqual(
      expect.objectContaining({ skipped: DECISION_NOTES_PER_SWEEP + 5, notes_missing: 5 })
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
