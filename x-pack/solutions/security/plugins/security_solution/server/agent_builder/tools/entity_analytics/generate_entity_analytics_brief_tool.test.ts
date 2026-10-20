/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
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
});
