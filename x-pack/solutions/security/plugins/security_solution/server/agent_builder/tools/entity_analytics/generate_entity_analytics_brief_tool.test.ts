/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import type { ExperimentalFeatures } from '../../../../common';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { generateBrief, getBriefToolId } from './brief';
import { createGenerateBriefTool } from './generate_entity_analytics_brief_tool';

jest.mock('./brief', () => ({ ...jest.requireActual('./brief'), generateBrief: jest.fn() }));

describe('getBriefToolId', () => {
  it('stays within the 64 characters models allow, for the ids the page generates', () => {
    const id = getBriefToolId(
      `${SecurityAgentBuilderAttachments.entityAnalyticsAiBrief}-1760955000000`
    );
    expect(id.length).toBeLessThanOrEqual(64);
    expect(id).toMatch(/^[a-z0-9_]+$/);
  });
});

describe('createGenerateBriefTool', () => {
  const {
    mockCore,
    mockLogger,
    mockEsClient,
    mockRequest,
    mockSecurityStart,
    mockCheckPrivileges,
  } = createToolTestMocks();
  const tool = createGenerateBriefTool({
    core: mockCore,
    logger: mockLogger,
    experimentalFeatures: {} as ExperimentalFeatures,
    kibanaVersion: '9.6.0',
    attachmentId: 'view',
    scope: { period: '7d', capturedAt: '2026-10-14T12:00:00.000Z', tiles: {} },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCore.getStartServices.mockResolvedValue([
      setupMockCoreStartServices(mockCore, mockEsClient),
      { security: mockSecurityStart },
      {},
    ]);
  });

  it('refuses a user without Entity Analytics privileges in the space, before reading anything', async () => {
    mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });

    const { results } = (await tool.handler(
      {},
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockCheckPrivileges).toHaveBeenCalled();
    expect(results[0]).toMatchObject({
      type: ToolResultType.error,
      data: {
        message: 'You do not have permission to generate the Entity Analytics brief in this space.',
      },
    });
    expect(generateBrief).not.toHaveBeenCalled();
  });

  describe('the ML job service the brief reads anomalies through', () => {
    const generateBriefMock = jest.mocked(generateBrief);
    const run = async (ml?: MlPluginSetup) => {
      mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: true });
      generateBriefMock.mockResolvedValueOnce({
        html: '<p></p>',
        height: 300,
        viewModel: { summary: 'Summary.', priorities: [] },
        priorityCount: 0,
      } as unknown as Awaited<ReturnType<typeof generateBrief>>);
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: 'attachment-1',
        current_version: 1,
      });
      await createGenerateBriefTool({
        core: mockCore,
        logger: mockLogger,
        experimentalFeatures: {} as ExperimentalFeatures,
        kibanaVersion: '9.6.0',
        ml,
        attachmentId: 'view',
        scope: { period: '7d', capturedAt: '2026-10-14T12:00:00.000Z', tiles: {} },
      }).handler({}, context);
      return { context, jobService: generateBriefMock.mock.calls[0][0].jobService };
    };
    const mlWith = (jobsSummary: jest.Mock) =>
      ({
        jobServiceProvider: jest.fn().mockReturnValue({ jobsSummary }),
      } as unknown as MlPluginSetup);

    it('gives the brief no job service without the ML plugin', async () => {
      expect((await run()).jobService).toBeUndefined();
    });

    it("reads the jobs for the request's space through the job service", async () => {
      const jobsSummary = jest.fn().mockResolvedValue([{ id: 'job-1' }]);
      const ml = mlWith(jobsSummary);
      const { context, jobService } = await run(ml);

      await expect(jobService?.jobsSummary()).resolves.toEqual([{ id: 'job-1' }]);
      expect(ml.jobServiceProvider).toHaveBeenCalledWith(mockRequest, context.savedObjectsClient);
    });

    it('reads the job list with a fake request when ML rejects the real one', async () => {
      const jobsSummary = jest
        .fn()
        .mockRejectedValueOnce(new Error('Insufficient privileges to access feature'))
        .mockResolvedValueOnce([{ id: 'job-1' }]);
      const ml = mlWith(jobsSummary);
      const { jobService } = await run(ml);

      await expect(jobService?.jobsSummary()).resolves.toEqual([{ id: 'job-1' }]);
      expect(jest.mocked(ml.jobServiceProvider).mock.calls[1][0]).not.toBe(mockRequest);
    });
  });
});
