/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createOpenProposalChecker } from '../../services/watches/hunt/packaging/check_open_proposals';
import { runPackageReport } from '../../services/watches/hunt/packaging/run_package_report';
import { getPackageReportStepDefinition } from './package_report_step';

jest.mock('../../services/watches/hunt/packaging/run_package_report', () => ({
  ...jest.requireActual('../../services/watches/hunt/packaging/run_package_report'),
  runPackageReport: jest.fn(),
}));
jest.mock('../../services/watches/hunt/packaging/check_open_proposals', () => ({
  createOpenProposalChecker: jest.fn(),
}));

const runPackageReportMock = runPackageReport as jest.Mock;
const createOpenProposalCheckerMock = createOpenProposalChecker as jest.Mock;

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
      getHuntServices: () => ({ getProposalsService: () => proposalsService } as never),
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
});
