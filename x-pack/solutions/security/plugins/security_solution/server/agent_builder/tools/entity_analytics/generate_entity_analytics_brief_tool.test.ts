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
import { generateBrief } from './brief';
import { generateEntityAnalyticsBriefTool } from './generate_entity_analytics_brief_tool';

jest.mock('./brief', () => ({ ...jest.requireActual('./brief'), generateBrief: jest.fn() }));

describe('generateEntityAnalyticsBriefTool', () => {
  const {
    mockCore,
    mockLogger,
    mockEsClient,
    mockRequest,
    mockSecurityStart,
    mockCheckPrivileges,
  } = createToolTestMocks();
  const tool = generateEntityAnalyticsBriefTool(
    mockCore,
    mockLogger,
    {} as ExperimentalFeatures,
    '9.6.0'
  );

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

    expect(results[0].type).toBe(ToolResultType.error);
    expect(generateBrief).not.toHaveBeenCalled();
  });
});
