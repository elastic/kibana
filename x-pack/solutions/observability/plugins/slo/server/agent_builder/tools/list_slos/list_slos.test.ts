/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { DefaultSummarySearchClient } from '../../../services/summary_search_client/summary_search_client';
import type { SummarySearchClient } from '../../../services/summary_search_client/types';
import type { SLODefinition } from '../../../domain/models';
import { createSLORepositoryMock, createSummarySearchClientMock } from '../../../services/mocks';
import type { SummaryResult } from '../../../services/summary_search_client/types';
import type { Paginated } from '@kbn/slo-schema';
import { createSLO } from '../../../services/fixtures/slo';
import type { SloToolDeps } from '../../common/deps';
import { listSlosTool } from './list_slos';

jest.mock('../../../services/summary_search_client/summary_search_client');

const MockDefaultSummarySearchClient = jest.mocked(DefaultSummarySearchClient);

function summarySearchResult(slo: SLODefinition): Paginated<SummaryResult> {
  return {
    total: 1,
    perPage: 25,
    page: 1,
    results: [summaryResultFor(slo)],
  };
}

function summaryResultFor(slo: Pick<SLODefinition, 'id'> & Partial<SLODefinition>): SummaryResult {
  return {
    sloId: slo.id,
    instanceId: ALL_VALUE,
    groupings: {},
    summary: {
      status: 'HEALTHY',
      sliValue: 0.9999,
      errorBudget: {
        initial: 0.001,
        consumed: 0.1,
        remaining: 0.9,
        isEstimated: false,
      },
      fiveMinuteBurnRate: 0,
      oneHourBurnRate: 0,
      oneDayBurnRate: 0,
    },
  };
}

describe('listSlosTool', () => {
  let mockSummarySearchClient: jest.Mocked<SummarySearchClient>;
  let mockRepository: ReturnType<typeof createSLORepositoryMock>;
  let mockSettingsRepository: { get: jest.Mock };
  let deps: SloToolDeps;
  let context: ToolHandlerContextMock;

  beforeEach(() => {
    mockSummarySearchClient = createSummarySearchClientMock();
    MockDefaultSummarySearchClient.mockImplementation(() => mockSummarySearchClient as any);

    mockRepository = createSLORepositoryMock();
    mockSettingsRepository = { get: jest.fn().mockResolvedValue({}) };

    const platinumLicensing = licensingMock.createStart();
    const platinumLicense = licensingMock.createLicenseMock();
    platinumLicense.hasAtLeast.mockReturnValue(true);
    platinumLicensing.getLicense.mockResolvedValue(platinumLicense);

    deps = {
      getScopedClients: jest.fn().mockResolvedValue({
        repository: mockRepository,
        settingsRepository: mockSettingsRepository,
        scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
        spaceId: 'default',
      }),
      getLicensing: jest.fn().mockResolvedValue(platinumLicensing),
      config: { isServerless: false, getIsCpsEnabled: () => false },
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
    };

    context = agentBuilderMocks.tools.createHandlerContext();
  });

  it('returns trimmed SLO results with correct pagination', async () => {
    const slo = createSLO();
    mockSummarySearchClient.search.mockResolvedValue(summarySearchResult(slo));
    mockRepository.findAllByIds.mockResolvedValue([slo]);

    const tool = listSlosTool(deps);
    const result = await tool.handler({ page: 2, perPage: 10 }, context);

    expect(isToolHandlerStandardReturn(result)).toBe(true);
    if (!isToolHandlerStandardReturn(result)) return;
    expect(result.results).toHaveLength(1);
    const [entry] = result.results;
    expect(entry.type).toBe(ToolResultType.other);
    expect((entry as any).tool_result_id).toBeDefined();

    const data = (entry as any).data;
    expect(data.total).toBe(1);
    expect(data.results).toHaveLength(1);

    const trimmed = data.results[0];
    expect(trimmed).toMatchObject({
      id: slo.id,
      name: slo.name,
      indicatorType: slo.indicator.type,
      objective: expect.any(Object),
      timeWindow: expect.any(Object),
    });
    expect(trimmed.status).toBeDefined();
    expect(trimmed.sliValue).toBeDefined();
    expect(trimmed.errorBudget).toBeDefined();
    expect(trimmed.groupings).toBeDefined();
    expect(trimmed.instanceId).toBeDefined();
    // verify page/perPage are passed as strings to FindSLO
    expect(mockSummarySearchClient.search).toHaveBeenCalledWith(
      '',
      '',
      expect.any(Object),
      expect.objectContaining({ page: 2, perPage: 10 }),
      undefined
    );
  });

  it('composes sloIds into slo.id:(...) ANDed with kqlQuery', async () => {
    const slo = createSLO({ id: 'abc' });
    mockSummarySearchClient.search.mockResolvedValue(summarySearchResult(slo));
    mockRepository.findAllByIds.mockResolvedValue([slo]);

    const tool = listSlosTool(deps);
    await tool.handler({ sloIds: ['abc', 'def'], kqlQuery: 'status:DEGRADED' }, context);

    const [kqlArg] = mockSummarySearchClient.search.mock.calls[0];
    expect(kqlArg).toContain('slo.id:("abc" OR "def")');
    expect(kqlArg).toContain('status:DEGRADED');
  });

  it('returns an error result (never rejects) and uses logger.debug for basic license', async () => {
    const basicLicensing = licensingMock.createStart();
    const basicLicense = licensingMock.createLicenseMock();
    basicLicense.hasAtLeast.mockReturnValue(false);
    basicLicensing.getLicense.mockResolvedValue(basicLicense);

    deps.getLicensing = jest.fn().mockResolvedValue(basicLicensing);

    const tool = listSlosTool(deps);
    const result = await tool.handler({}, context);

    expect(isToolHandlerStandardReturn(result)).toBe(true);
    if (!isToolHandlerStandardReturn(result)) return;
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(context.logger.debug).toHaveBeenCalled();
    expect(context.logger.warn).not.toHaveBeenCalled();
  });

  it('returns an error result with logger.warn when getScopedClients rejects', async () => {
    (deps.getScopedClients as jest.Mock).mockRejectedValue(new Error('scope failure'));

    const tool = listSlosTool(deps);
    const result = await tool.handler({}, context);

    expect(isToolHandlerStandardReturn(result)).toBe(true);
    if (!isToolHandlerStandardReturn(result)) return;
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(context.logger.warn).toHaveBeenCalled();
  });

  it('rejects perPage beyond 100 at the schema level', () => {
    const tool = listSlosTool(deps);
    const parseResult = tool.schema.safeParse({ perPage: 101 });
    expect(parseResult.success).toBe(false);
  });
});
