/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { HUNT_COVERAGE_AI_INDEX_DEST } from '../../../common/step_types/package_report';
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
  keepTags = false,
  closed = tagged,
}: {
  decisionId?: string;
  tagged?: string[];
  storedSpace?: string;
  getError?: Error & { statusCode?: number };
  updateError?: Error & { statusCode?: number };
  statusError?: Error;
  keepTags?: boolean;
  /** The tagged alerts that are still closed; the others were moved on by an analyst. */
  closed?: string[];
}) => {
  let left = [...tagged];
  const callKibanaApi = jest.fn(async ({ path, body }: { path: string; body?: any }) => {
    if (path.endsWith('/signals/search')) {
      return {
        body: {
          hits: {
            hits: left.map((_id) => ({
              _id,
              _source: {
                'kibana.alert.workflow_status': closed.includes(_id) ? 'closed' : 'acknowledged',
              },
            })),
          },
        },
      };
    }
    if (path.endsWith('/signals/status')) {
      if (statusError) throw statusError;
      return { body: { updated: body.signal_ids.length, failures: [] } };
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
  const run = () =>
    getTriageRevokeFpDecisionStepDefinition().handler({
      input: { decision_id: decisionId, space_id: 'default' },
      contextManager: {
        callKibanaApi,
        getFakeRequest: () => ({}),
        getScopedEsClient: () => ({ get, update }),
      },
      logger: { warn: jest.fn() },
    } as unknown as StepHandlerContext<unknown, unknown>);
  const calls = (suffix: string) =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith(suffix))
      .map(([{ body }]) => body);
  return { run, get, update, calls };
};

describe('triage revoke decision step', () => {
  it('soft-deletes the decision, reopens exactly the alerts it closed and removes its tag', async () => {
    const { run, update, calls } = setup({});

    const { output } = await run();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: HUNT_COVERAGE_AI_INDEX_DEST.value,
        id: APPROVAL,
        doc: expect.objectContaining({ governance: { lifecycle: { status: 'deleted' } } }),
      })
    );
    expect(calls('/signals/status')).toEqual([{ signal_ids: ['a', 'b'], status: 'open' }]);
    expect(calls('/signals/tags')).toEqual([
      {
        ids: ['a', 'b'],
        tags: { tags_to_add: [], tags_to_remove: [`az:closed_by_decision:${APPROVAL}`] },
      },
    ]);
    expect(output).toEqual({ status: 'ok', alerts_reopened: 2, alerts_released: 0, failures: 0 });
  });

  it('does not reopen an alert an analyst moved on from, and still removes its tag', async () => {
    const { run, calls } = setup({ tagged: ['a', 'b'], closed: ['a'] });

    const { output } = await run();

    expect(calls('/signals/status')).toEqual([{ signal_ids: ['a'], status: 'open' }]);
    expect(calls('/signals/tags')[0].ids).toEqual(['a', 'b']);
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

  it('does not touch a decision of another space, nor any alert', async () => {
    const { run, update, calls } = setup({ storedSpace: 'other' });

    const { output } = await run();

    expect(update).not.toHaveBeenCalled();
    expect(calls('/signals/search')).toEqual([]);
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
