/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reviseProposalTool } from './revise_proposal_tool';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';

const logger = () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() });

const requestMock = {} as never;

const agenticWith = (opts: {
  assertCanManage?: jest.Mock;
  revise?: jest.Mock;
  getLatestRevision?: jest.Mock;
}): (() => AgenticInvestigationsPluginStart) => {
  const assertCanManage = opts.assertCanManage ?? jest.fn().mockResolvedValue(undefined);
  const revise =
    opts.revise ?? jest.fn().mockResolvedValue({ proposalId: 'proposal-2', revision: 2 });
  // Defaults to the identity answer: the id passed in is already the live head.
  const getLatestRevision =
    opts.getLatestRevision ??
    jest.fn().mockImplementation(async (id: string) => ({
      proposalId: id,
      revision: 1,
      status: 'pending',
      decision: undefined,
    }));
  return () =>
    ({
      getProposalPrivileges: () => ({ assertCanManage }),
      getProposalsService: () => ({ revise, getLatestRevision }),
    } as unknown as AgenticInvestigationsPluginStart);
};

const run = async (
  getAgenticInvestigations: () => AgenticInvestigationsPluginStart,
  // Derived from the tool itself rather than restated: a literal copy drifts
  // from the schema the moment the schema gains a field.
  input: Parameters<ReturnType<typeof reviseProposalTool>['handler']>[0]
) => {
  const tool = reviseProposalTool(getAgenticInvestigations);
  const result = await tool.handler(input, {
    logger: logger(),
    request: requestMock,
    spaceId: 'default',
  } as never);
  if (!('results' in result)) {
    throw new Error('expected a standard tool result');
  }
  return result;
};

describe('reviseProposalTool', () => {
  it('checks the manage privilege before revising', async () => {
    const assertCanManage = jest.fn().mockResolvedValue(undefined);
    const getLatestRevision = jest.fn().mockResolvedValue({
      proposalId: 'proposal-1',
      revision: 1,
      status: 'pending',
      decision: undefined,
    });
    const revise = jest.fn().mockResolvedValue({ proposalId: 'proposal-2', revision: 2 });
    await run(agenticWith({ assertCanManage, revise, getLatestRevision }), {
      proposalId: 'proposal-1',
      comment: 'Tightened the match',
    });

    expect(assertCanManage).toHaveBeenCalledWith(requestMock);
    expect(getLatestRevision).toHaveBeenCalledWith('proposal-1', 'default');
    expect(revise).toHaveBeenCalledWith(
      { id: 'proposal-1', comment: 'Tightened the match' },
      'default'
    );
  });

  it('revises the live head when the given id is an earlier link in the chain', async () => {
    const getLatestRevision = jest
      .fn()
      .mockResolvedValue({ proposalId: 'proposal-2', revision: 2, status: 'pending' });
    const revise = jest.fn().mockResolvedValue({ proposalId: 'proposal-3', revision: 3 });
    const result = await run(agenticWith({ getLatestRevision, revise }), {
      proposalId: 'proposal-1',
      impact: 'critical',
    });

    expect(getLatestRevision).toHaveBeenCalledWith('proposal-1', 'default');
    expect(revise).toHaveBeenCalledWith({ id: 'proposal-2', impact: 'critical' }, 'default');
    expect(result.results[0].data).toMatchObject({
      proposalId: 'proposal-3',
      supersedes: 'proposal-2',
    });
  });

  it('returns the new revision id, revision number, status, and the supersedes pointer', async () => {
    const revise = jest.fn().mockResolvedValue({ proposalId: 'proposal-2', revision: 3 });
    const result = await run(agenticWith({ revise }), { proposalId: 'proposal-1' });

    expect(result.results[0].data).toMatchObject({
      proposalId: 'proposal-2',
      revision: 3,
      status: 'pending',
      supersedes: 'proposal-1',
    });
  });

  /**
   * The HTTP route validates `actionInput` through `boundedActionInput`; the
   * tool reaches the same service, so an unbounded record here would be the
   * bypass the route closes.
   */
  it('caps actionInput the same way the HTTP route does', () => {
    const schema = reviseProposalTool(agenticWith({})).schema;

    expect(
      schema.safeParse({ proposalId: 'proposal-1', actionInput: { ['k'.repeat(257)]: true } })
        .success
    ).toBe(false);
    expect(
      schema.safeParse({
        proposalId: 'proposal-1',
        actionInput: Object.fromEntries(
          Array.from({ length: 101 }, (_unused, index) => [`k${index}`, true])
        ),
      }).success
    ).toBe(false);
    expect(schema.safeParse({ proposalId: 'proposal-1', actionInput: { name: 'x' } }).success).toBe(
      true
    );
  });

  it('never calls revise() when the privilege check rejects', async () => {
    const assertCanManage = jest.fn().mockRejectedValue(new Error('missing manage_proposals'));
    const getLatestRevision = jest.fn();
    const revise = jest.fn();
    const result = await run(agenticWith({ assertCanManage, revise, getLatestRevision }), {
      proposalId: 'proposal-1',
    });

    expect(getLatestRevision).not.toHaveBeenCalled();
    expect(revise).not.toHaveBeenCalled();
    expect(JSON.stringify(result.results[0])).toContain('missing manage_proposals');
  });

  it('returns an error result instead of throwing when the service rejects (e.g. already superseded)', async () => {
    const revise = jest.fn().mockRejectedValue(new Error('already superseded'));
    const result = await run(agenticWith({ revise }), { proposalId: 'proposal-1' });

    expect(JSON.stringify(result.results[0])).toContain('already superseded');
  });

  it('declares the documented tool id and write annotations', () => {
    const tool = reviseProposalTool(agenticWith({}));
    expect(tool.id).toBe('security.alertzero.proposals.revise');
    expect(tool.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    });
    expect(tool.type).toBe('builtin');
  });
});
