/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { TRIAGE_DECISIONS_AI_INDEX_DEST } from '../../../common/step_types/triage_decisions_index';
import { MAX_REVOKE_PAGES } from '../../alert_triage/constants';
import { getTriageRevokeFpDecisionStepDefinition } from './revoke_fp_decision_step';

const APPROVAL = 'fp-decision-0123456789abcdef';
const DISMISSAL = 'fp-dismissal-0123456789abcdef';

const setup = ({
  decisionId = APPROVAL,
  tagged = ['a', 'b'],
  storedSpace = 'default',
  getError,
  updateError,
  statusError,
  statusTimedOut = false,
  keepTags = false,
  alerts = {},
  canWriteDecisions = true,
}: {
  decisionId?: string;
  tagged?: string[];
  storedSpace?: string;
  getError?: Error & { statusCode?: number };
  updateError?: Error & { statusCode?: number };
  statusError?: Error;
  /** The status route answers 200 but its update-by-query timed out part way. */
  statusTimedOut?: boolean;
  keepTags?: boolean;
  /** What an analyst did to a tagged alert since the decision closed it. Default: still closed as a false positive. */
  alerts?: Record<string, { status: string; reason?: string }>;
  /** Whether the caller may write the decisions index: the worker's role can, a user's cannot. */
  canWriteDecisions?: boolean;
}) => {
  let left = [...tagged];
  const state = new Map(
    tagged.map((id) => [id, alerts[id] ?? { status: 'closed', reason: 'false_positive' }])
  );
  const callKibanaApi = jest.fn(async ({ path, body }: { path: string; body?: any }) => {
    if (path.endsWith('/signals/search')) {
      return { body: { hits: { hits: left.map((_id) => ({ _id })) } } };
    }
    if (path.endsWith('/signals/status')) {
      if (statusError) throw statusError;
      // The route applies the query, so an alert that moved on is not updated.
      const filter: any[] = body.query.bool.filter;
      const ids: string[] = filter.find((f) => f.ids).ids.values;
      const terms = filter.filter((f) => f.term).map((f) => Object.values(f.term)[0]);
      const matching = ids.filter((id) => {
        const alert = state.get(id);
        return (
          alert !== undefined &&
          terms.every((t) => [alert.status, alert.reason].includes(t as string))
        );
      });
      matching.forEach((id) => state.set(id, { status: body.status }));
      return { body: { updated: matching.length, timed_out: statusTimedOut, failures: [] } };
    }
    if (!keepTags) left = left.filter((id) => !body.ids.includes(id));
    return { body: { updated: body.ids.length, timed_out: false, failures: [] } };
  });
  const get = jest.fn(async () => {
    if (getError) throw getError;
    return { _source: { attributes: { space_id: storedSpace } } };
  });
  const update = jest.fn(async () => {
    if (updateError) throw updateError;
    return {};
  });
  const hasPrivileges = jest.fn(async () => ({ has_all_requested: canWriteDecisions }));
  const run = () =>
    getTriageRevokeFpDecisionStepDefinition().handler({
      input: { decision_id: decisionId, space_id: 'default' },
      contextManager: {
        callKibanaApi,
        getFakeRequest: () => ({}),
        getScopedEsClient: () => ({ get, update, security: { hasPrivileges } }),
      },
      logger: { warn: jest.fn() },
    } as unknown as StepHandlerContext<unknown, unknown>);
  const calls = (suffix: string) =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith(suffix))
      .map(([{ body }]) => body);
  return { run, get, update, hasPrivileges, calls };
};

describe('triage revoke decision step', () => {
  it('soft-deletes the decision, reopens exactly the alerts it closed and removes its tag', async () => {
    const { run, update, calls } = setup({});

    const { output } = await run();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: TRIAGE_DECISIONS_AI_INDEX_DEST.value,
        id: APPROVAL,
        doc: expect.objectContaining({ governance: { lifecycle: { status: 'deleted' } } }),
      })
    );
    expect(calls('/signals/status')).toEqual([
      {
        query: {
          bool: {
            filter: [
              { ids: { values: ['a', 'b'] } },
              { term: { 'kibana.alert.workflow_status': 'closed' } },
              { term: { 'kibana.alert.workflow_reason': 'false_positive' } },
            ],
          },
        },
        status: 'open',
      },
    ]);
    expect(calls('/signals/tags')).toEqual([
      {
        ids: ['a', 'b'],
        tags: { tags_to_add: [], tags_to_remove: [`az:closed_by_decision:${APPROVAL}`] },
      },
    ]);
    expect(output).toEqual({ status: 'ok', alerts_reopened: 2, alerts_released: 0, failures: 0 });
  });

  it('does not reopen an alert an analyst moved on from, and still removes its tag', async () => {
    const { run, calls } = setup({
      tagged: ['a', 'b', 'c'],
      alerts: {
        // Reopened, then investigated and closed as a true positive: the analyst's verdict stands.
        b: { status: 'closed', reason: 'true_positive' },
        c: { status: 'acknowledged' },
      },
    });

    const { output } = await run();

    expect(calls('/signals/tags')[0].ids).toEqual(['a', 'b', 'c']);
    expect(output).toEqual({ status: 'ok', alerts_reopened: 1, alerts_released: 0, failures: 0 });
  });

  it('releases the alerts a dismissal kept out of analysis without reopening anything', async () => {
    const { run, calls } = setup({ decisionId: DISMISSAL });

    const { output } = await run();

    expect(calls('/signals/status')).toEqual([]);
    expect(calls('/signals/tags')[0].tags.tags_to_remove).toEqual([
      `az:skipped_by_decision:${DISMISSAL}`,
      'az:inconclusive',
    ]);
    expect(output).toEqual({ status: 'ok', alerts_reopened: 0, alerts_released: 2, failures: 0 });
  });

  it('still puts the alerts back when the decision is already gone', async () => {
    const { run } = setup({
      getError: Object.assign(new Error('not found'), { statusCode: 404 }),
    });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ status: 'not_found', alerts_reopened: 2 }));
  });

  it('changes nothing when a caller that cannot write the decisions index reads the decision as missing', async () => {
    // Elasticsearch hides decisions from users, so a live decision reads as a 404 to an analyst.
    // Releasing the alerts would leave the decision active, and the next sweep would act on them again.
    const { run, update, hasPrivileges, calls } = setup({
      getError: Object.assign(new Error('not found'), { statusCode: 404 }),
      canWriteDecisions: false,
    });

    const { output } = await run();

    expect(hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: [TRIAGE_DECISIONS_AI_INDEX_DEST.value], privileges: ['index'] }],
    });
    expect(update).not.toHaveBeenCalled();
    expect(calls('/signals/search')).toEqual([]);
    expect(calls('/signals/tags')).toEqual([]);
    expect(output).toEqual({
      status: 'denied',
      alerts_reopened: 0,
      alerts_released: 0,
      failures: 0,
    });
  });

  it('does not check access when the decision is read, so the worker pays nothing on the normal path', async () => {
    const { run, hasPrivileges } = setup({});

    await run();

    expect(hasPrivileges).not.toHaveBeenCalled();
  });

  it('treats a decision of another space as missing: not deleted, only this space is cleaned', async () => {
    // The id hashes the space and the search is space-scoped, so no alert here carries its tag.
    const { run, update, calls } = setup({ storedSpace: 'other', tagged: [] });

    const { output } = await run();

    expect(update).not.toHaveBeenCalled();
    expect(calls('/signals/search')).toEqual([
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              { term: { 'kibana.alert.workflow_tags': `az:closed_by_decision:${APPROVAL}` } },
            ],
          },
        },
      }),
    ]);
    expect(calls('/signals/status')).toEqual([]);
    expect(calls('/signals/tags')).toEqual([]);
    expect(output).toEqual({
      status: 'not_found',
      alerts_reopened: 0,
      alerts_released: 0,
      failures: 0,
    });
  });

  it('puts nothing back when the decision could not be deleted, so a rerun is safe', async () => {
    const { run, calls } = setup({ getError: new Error('es down') });

    const { output } = await run();

    expect(output).toEqual({ status: 'ok', alerts_reopened: 0, alerts_released: 0, failures: 1 });
    expect(calls('/signals/status')).toEqual([]);
  });

  it('keeps the tag on alerts it could not reopen, and reports the failure', async () => {
    const { run, calls } = setup({ statusError: new Error('conflict') });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ alerts_reopened: 0, failures: 1 }));
    expect(calls('/signals/tags')).toEqual([]);
  });

  it('keeps the tag when the reopen timed out with a 200, so a rerun can find the alerts it missed', async () => {
    const { run, calls } = setup({ statusTimedOut: true });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ alerts_reopened: 0, failures: 1 }));
    expect(calls('/signals/tags')).toEqual([]);
  });

  it('reports a failure when the page limit stops it with alerts still tagged, so it is not read as complete', async () => {
    // The status route reports success but the tags never leave, so every page finds the same alerts.
    const { run, calls } = setup({ tagged: ['a', 'b'], keepTags: true });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ failures: 1 }));
    expect(calls('/signals/search')).toHaveLength(MAX_REVOKE_PAGES);
  });

  it('does nothing to alerts when none carry the tag', async () => {
    const { run, calls } = setup({ tagged: [] });

    const { output } = await run();

    expect(output).toEqual(expect.objectContaining({ alerts_reopened: 0, failures: 0 }));
    expect(calls('/signals/status')).toEqual([]);
  });
});
