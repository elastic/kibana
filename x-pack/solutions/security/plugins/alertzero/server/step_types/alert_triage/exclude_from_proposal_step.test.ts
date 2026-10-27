/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { getTriageExcludeFromProposalStepDefinition } from './exclude_from_proposal_step';

const ROOT = 'proposal-1';

const alertDoc = (id: string, tags: string[]) => ({
  _id: id,
  _index: 'alerts',
  _source: { 'kibana.alert.workflow_tags': tags },
});

const head = (alertIds: string[], overrides: Record<string, unknown> = {}) => ({
  id: ROOT,
  rootProposalId: ROOT,
  revision: 1,
  status: 'pending',
  conversationId: 'conv-owner',
  comment: 'Close 3 alerts',
  actionInput: { alertIds },
  ...overrides,
});

const setup = ({
  alerts,
  heads = [head(['a', 'b', 'c'])],
  canRead = true,
}: {
  alerts: Array<ReturnType<typeof alertDoc>>;
  heads?: Array<Record<string, unknown>>;
  canRead?: boolean;
}) => {
  const service = {
    list: jest.fn().mockResolvedValue({ proposals: heads, total: heads.length }),
    revise: jest.fn().mockResolvedValue({ proposalId: 'revision-2', revision: 2 }),
  };
  const privileges = {
    assertCanRead: jest.fn(async () => {
      if (!canRead) throw new Error('forbidden');
    }),
  };
  const callKibanaApi = jest.fn(async ({ body }) => ({
    status: 200,
    headers: {},
    body: {
      hits: {
        hits: alerts.filter(({ _id }) => (body.query.ids.values as string[]).includes(_id)),
      },
    },
  }));
  const definition = getTriageExcludeFromProposalStepDefinition({
    getProposals: () =>
      ({
        getProposalsService: () => service,
        getProposalPrivileges: () => privileges,
      } as never),
  });
  const run = async (alertIds: string[]) =>
    (
      await definition.handler({
        input: { alert_ids: alertIds },
        contextManager: {
          callKibanaApi,
          getContext: () => ({ workflow: { spaceId: 'default' } }),
          getFakeRequest: () => ({}),
        },
      } as unknown as StepHandlerContext<unknown, unknown>)
    ).output as Record<string, unknown>;
  return { service, run };
};

describe('triage exclude from proposal step', () => {
  it('revises the proposal without the alert an analyst marked true positive', async () => {
    const { run, service } = setup({
      alerts: [
        alertDoc('a', ['az:false_positive', `az:proposal:${ROOT}`]),
        alertDoc('b', ['az:false_positive', 'az:true_positive', `az:proposal:${ROOT}`]),
        alertDoc('c', ['az:false_positive', `az:proposal:${ROOT}`]),
      ],
    });

    const output = await run(['b']);

    expect(service.revise).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ROOT,
        actionInput: { alertIds: ['a', 'c'] },
        comment: expect.stringContaining('1 alert excluded by analysts'),
      }),
      'default',
      {}
    );
    expect(output).toEqual({
      proposals: [
        {
          root_proposal_id: ROOT,
          conversation_id: 'conv-owner',
          revision: 2,
          excluded_count: 1,
          true_positive_count: 1,
          remaining_count: 2,
          revised: true,
        },
      ],
      excluded_alert_ids: ['b'],
      needs_verdict_alert_ids: [],
    });
  });

  it('asks for a verdict for an excluded alert that has none', async () => {
    const { run } = setup({ alerts: [alertDoc('b', [`az:proposal:${ROOT}`])] });

    expect(await run(['b'])).toEqual(
      expect.objectContaining({ excluded_alert_ids: ['b'], needs_verdict_alert_ids: ['b'] })
    );
  });

  it('keeps the existing comment and adds to it', async () => {
    const { run, service } = setup({
      alerts: [alertDoc('b', ['az:inconclusive', `az:proposal:${ROOT}`])],
    });

    await run(['b']);

    expect(service.revise.mock.calls[0][0].comment).toMatch(/^Close 3 alerts\n\n1 alert excluded/);
  });

  it('reads no proposals when no alert is in one', async () => {
    const { run, service } = setup({ alerts: [alertDoc('b', ['az:true_positive'])] });

    expect(await run(['b'])).toEqual({
      proposals: [],
      excluded_alert_ids: [],
      needs_verdict_alert_ids: [],
    });
    expect(service.list).not.toHaveBeenCalled();
  });

  it('leaves a settled proposal and its alerts alone', async () => {
    const { run, service } = setup({
      alerts: [alertDoc('b', ['az:inconclusive', `az:proposal:${ROOT}`])],
      heads: [head(['a', 'b'], { status: 'expired' })],
    });

    expect(await run(['b'])).toEqual(expect.objectContaining({ excluded_alert_ids: [] }));
    expect(service.revise).not.toHaveBeenCalled();
  });

  it('does nothing when the caller cannot read proposals', async () => {
    const { run, service } = setup({
      alerts: [alertDoc('b', ['az:inconclusive', `az:proposal:${ROOT}`])],
      canRead: false,
    });

    expect(await run(['b'])).toEqual(expect.objectContaining({ excluded_alert_ids: [] }));
    expect(service.list).not.toHaveBeenCalled();
  });
});
