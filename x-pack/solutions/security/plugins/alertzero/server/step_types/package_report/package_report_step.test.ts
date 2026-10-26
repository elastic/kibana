/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createOpenProposalChecker } from '../../services/watches/hunt/packaging/check_open_proposals';
import { createAlsoRaisedByAppender } from '../../services/watches/hunt/packaging/converge_on_live_proposal';
import { createProposalSlotResolver } from '../../services/watches/hunt/packaging/resolve_proposal_slot';
import { runPackageReport } from '../../services/watches/hunt/packaging/run_package_report';
import { getPackageReportStepDefinition } from './package_report_step';

jest.mock('../../services/watches/hunt/packaging/run_package_report', () => ({
  ...jest.requireActual('../../services/watches/hunt/packaging/run_package_report'),
  runPackageReport: jest.fn(),
}));
jest.mock('../../services/watches/hunt/packaging/check_open_proposals', () => ({
  createOpenProposalChecker: jest.fn(),
}));
jest.mock('../../services/watches/hunt/packaging/converge_on_live_proposal', () => ({
  ...jest.requireActual('../../services/watches/hunt/packaging/converge_on_live_proposal'),
  createAlsoRaisedByAppender: jest.fn(),
}));
jest.mock('../../services/watches/hunt/packaging/resolve_proposal_slot', () => ({
  ...jest.requireActual('../../services/watches/hunt/packaging/resolve_proposal_slot'),
  createProposalSlotResolver: jest.fn(),
}));

const runPackageReportMock = runPackageReport as jest.Mock;
const createOpenProposalCheckerMock = createOpenProposalChecker as jest.Mock;
const createAlsoRaisedByAppenderMock = createAlsoRaisedByAppender as jest.Mock;
const createProposalSlotResolverMock = createProposalSlotResolver as jest.Mock;

describe('package_report step wiring', () => {
  it('threads the open-Proposal checker into runPackageReport', async () => {
    const checker = jest.fn();
    createOpenProposalCheckerMock.mockReturnValue(checker);
    runPackageReportMock.mockResolvedValue({ status: 'run_incomplete', reason: 'stub' });

    const proposalsService = {};
    const logger = loggingSystemMock.createLogger();
    const request = {};
    const definition = getPackageReportStepDefinition({
      getActionsService: () => ({ list: jest.fn() } as never),
      getConversations: () =>
        ({
          getScopedClient: async () => ({ get: async () => ({ attachments: [] }) }),
        } as never),
      getHuntServices: () =>
        ({
          getProposalsService: () => proposalsService,
          getProposalPrivileges: () => ({ canManage: async () => true }),
        } as never),
      isContextEngineEnabled: async () => false,
      logger,
    });

    await definition.handler({
      input: {
        spaceId: 'default',
        reportId: 'rpt-1',
        investigationConversationId: 'conv-1',
        runId: 'run-1',
        huntStatus: 'success',
        hasConfirmedHit: false,
      },
      contextManager: {
        getContext: () => ({ workflow: { spaceId: 'default' } }),
        getFakeRequest: () => request,
        getScopedEsClient: () => ({}),
      },
    } as never);

    expect(createOpenProposalCheckerMock).toHaveBeenCalledWith({
      proposalsService,
      spaceId: 'default',
      request,
      logger,
    });
    expect(runPackageReportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deps: expect.objectContaining({ hasOpenProposal: checker }),
      })
    );
  });

  it('hands the proposal privileges to the appender that revises, and both new look-ups to runPackageReport', async () => {
    // The Proposals service writes with its own credentials and relies on its callers to check
    // who is asking, so the appender has to be given the means to.
    const appendAlsoRaisedBy = jest.fn();
    const resolveProposalSlot = jest.fn();
    createAlsoRaisedByAppenderMock.mockReturnValue(appendAlsoRaisedBy);
    createProposalSlotResolverMock.mockReturnValue(resolveProposalSlot);
    runPackageReportMock.mockResolvedValue({ status: 'run_incomplete', reason: 'stub' });

    const proposalsService = {};
    const privileges = { canManage: async () => true };
    const logger = loggingSystemMock.createLogger();
    const request = {};
    const definition = getPackageReportStepDefinition({
      getActionsService: () => ({ list: jest.fn() } as never),
      getConversations: () =>
        ({
          getScopedClient: async () => ({ get: async () => ({ attachments: [] }) }),
        } as never),
      getHuntServices: () =>
        ({
          getProposalsService: () => proposalsService,
          getProposalPrivileges: () => privileges,
        } as never),
      isContextEngineEnabled: async () => false,
      logger,
    });

    await definition.handler({
      input: {
        spaceId: 'default',
        reportId: 'rpt-1',
        investigationConversationId: 'conv-1',
        runId: 'run-1',
        huntStatus: 'success',
        hasConfirmedHit: false,
      },
      contextManager: {
        getContext: () => ({ workflow: { spaceId: 'default' } }),
        getFakeRequest: () => request,
        getScopedEsClient: () => ({}),
      },
    } as never);

    expect(createAlsoRaisedByAppenderMock).toHaveBeenCalledWith({
      proposalsService,
      privileges,
      spaceId: 'default',
      request,
      logger,
    });
    // What the resolver reads belongs to other Investigations: it needs the means to check that the
    // request may read proposals, to ask whether their owner is still open, and to know which
    // Investigation is this run's own.
    expect(createProposalSlotResolverMock).toHaveBeenCalledWith({
      proposalsService,
      privileges,
      isInvestigationOpen: expect.any(Function),
      investigationConversationId: 'conv-1',
      spaceId: 'default',
      request,
      logger,
    });
    expect(runPackageReportMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        deps: expect.objectContaining({ appendAlsoRaisedBy, resolveProposalSlot }),
      })
    );
  });
});
