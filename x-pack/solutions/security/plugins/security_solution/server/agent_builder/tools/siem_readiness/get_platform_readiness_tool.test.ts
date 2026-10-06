/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { PlatformReadinessPayload } from '@kbn/siem-readiness';
import {
  createToolTestMocks,
  createToolHandlerContext,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import { getPlatformReadinessTool } from './get_platform_readiness_tool';
import {
  getContinuity,
  getCoverage,
  getQuality,
  getRetention,
} from '../../../lib/siem_readiness/dimensions';
import { getSiemReadinessSharedContext } from '../../../lib/siem_readiness/fetchers';

jest.mock('../../../lib/siem_readiness/dimensions', () => ({
  getCoverage: jest.fn(),
  getQuality: jest.fn(),
  getContinuity: jest.fn(),
  getRetention: jest.fn(),
}));
jest.mock('../../../lib/siem_readiness/fetchers', () => ({
  getSiemReadinessSharedContext: jest.fn(),
  fetchSiemReadinessSharedContext: jest.fn(),
}));

const mockGetCoverage = getCoverage as jest.Mock;
const mockGetQuality = getQuality as jest.Mock;
const mockGetContinuity = getContinuity as jest.Mock;
const mockGetRetention = getRetention as jest.Mock;
const mockGetSharedContext = getSiemReadinessSharedContext as jest.Mock;

const mockSharedContext = {
  reverseMapResult: {
    indexToRules: new Map([
      [
        'logs-aws.cloudtrail-default',
        [
          {
            id: 'rule-1',
            name: 'AWS Rule',
            tactics: [{ id: 'TA0001', name: 'Initial Access' }],
            enabled: true,
          },
        ],
      ],
    ]),
    pipelineToIndices: new Map(),
    categoryToIndices: new Map([['Cloud', ['logs-aws.cloudtrail-default']]]),
    tacticTotals: new Map(),
    mlRules: [],
    errors: { pipelineMap: false, categoryMap: false, rulesPartial: false },
  },
  categoriesResult: {
    rawCategoriesMap: [],
    mainCategoriesMap: [
      {
        category: 'Cloud',
        indices: [{ indexName: 'logs-aws.cloudtrail-default', docs: 100 }],
      },
    ],
  },
  indexToPlatform: new Map([['logs-aws.cloudtrail-default', 'AWS account 123456789012']]),
};

describe('getPlatformReadinessTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getPlatformReadinessTool(mockCore, mockLogger, false);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetSharedContext.mockResolvedValue(mockSharedContext);
    mockGetCoverage.mockResolvedValue({
      status: 'healthy',
      summary: 'Coverage healthy',
      items: [],
      actionableFindings: [],
    });
    mockGetQuality.mockResolvedValue({
      status: 'healthy',
      summary: 'Quality healthy',
      items: [],
      actionableFindings: [],
    });
    mockGetContinuity.mockResolvedValue({
      status: 'actionsRequired',
      summary: 'Continuity issues',
      items: [],
      actionableFindings: [
        {
          severity: 'CRITICAL',
          message: 'Data stream serving pipeline cloudtrail-pipeline has gone silent',
          resource: 'cloudtrail-pipeline',
          type: 'silence',
        },
      ],
    });
    mockGetRetention.mockResolvedValue({
      status: 'healthy',
      summary: 'Retention healthy',
      items: [],
      actionableFindings: [],
    });
  });

  it('returns ToolResultType.other with platform rollup data', async () => {
    const result = (await tool.handler(
      {},
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    const data = (result.results[0] as OtherResult<PlatformReadinessPayload>).data;
    expect(data.platforms.length).toBeGreaterThan(0);
    expect(data.platforms[0].platform).toBe('AWS account 123456789012');
    expect(data.platforms[0].enabledRules).toBe(1);
  });

  it('filters by platform when platform param is provided', async () => {
    const result = (await tool.handler(
      { platform: 'AWS account 123456789012' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    const data = (result.results[0] as OtherResult<PlatformReadinessPayload>).data;
    expect(data.platforms).toHaveLength(1);
    expect(data.platforms[0].platform).toBe('AWS account 123456789012');
  });

  it('returns ToolResultType.error when a dimension fetch throws', async () => {
    mockGetQuality.mockRejectedValueOnce(new Error('ES failure'));
    const result = (await tool.handler(
      {},
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
  });
});
