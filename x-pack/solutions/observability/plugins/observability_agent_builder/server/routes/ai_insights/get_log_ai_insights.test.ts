/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { getLogAiInsights, type GetLogAiInsightsParams } from './get_log_ai_insights';

jest.mock('./get_log_document_by_id', () => ({
  getLogDocumentById: jest.fn(),
}));

jest.mock('../../tools/get_traces/handler', () => ({
  getToolHandler: jest.fn().mockResolvedValue({ traces: [] }),
}));

jest.mock('../../utils/warning_and_above_log_filter', () => ({
  isWarningOrAbove: jest.fn().mockReturnValue(false),
}));

jest.mock('../../agent/register_observability_agent', () => ({
  getEntityLinkingInstructions: jest.fn().mockReturnValue(''),
}));

jest.mock('./types', () => ({
  createAiInsightResult: jest.fn((context: string, _connector: unknown, events$: unknown) => ({
    context,
    events$,
  })),
}));

const { getLogDocumentById } = jest.requireMock('./get_log_document_by_id');
const { getToolHandler: getTraces } = jest.requireMock('../../tools/get_traces/handler');

const mockLogger = { debug: jest.fn(), error: jest.fn() } as unknown as Logger;

function createBaseParams(overrides: Partial<GetLogAiInsightsParams> = {}): GetLogAiInsightsParams {
  return {
    core: { http: { basePath: { get: () => '' } } } as any,
    plugins: {} as any,
    inferenceClient: { chatComplete: jest.fn().mockReturnValue(EMPTY) } as any,
    connectorId: 'test-connector',
    connector: {} as any,
    request: httpServerMock.createKibanaRequest(),
    esClient: { asCurrentUser: {} } as any,
    logger: mockLogger,
    ...overrides,
  };
}

describe('getLogAiInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTraces.mockResolvedValue({ traces: [] });
  });

  it('throws when document is not found by id', async () => {
    getLogDocumentById.mockResolvedValue(undefined);

    await expect(
      getLogAiInsights(createBaseParams({ index: 'logs-test', id: 'missing' }))
    ).rejects.toThrow('Log entry not found');
  });

  it('uses index/id path and ignores fields when both are provided', async () => {
    const mockDoc = { '@timestamp': '2026-01-01T00:00:00Z', message: 'from ES' };
    getLogDocumentById.mockResolvedValue(mockDoc);

    const result = await getLogAiInsights(
      createBaseParams({
        index: 'logs-test',
        id: 'doc-1',
        fields: { '@timestamp': '2026-01-01T00:00:00Z', message: 'from fields' },
      })
    );

    expect(getLogDocumentById).toHaveBeenCalled();
    expect(result.context).toContain('from ES');
    expect(result.context).not.toContain('from fields');
  });

  it('uses fields directly and does not fetch from ES when index/id are absent', async () => {
    const fields = {
      '@timestamp': '2026-01-01T00:00:00Z',
      message: 'from fields',
      'service.name': 'test-svc',
      nullField: null,
    };

    const result = await getLogAiInsights(createBaseParams({ fields }));

    expect(getLogDocumentById).not.toHaveBeenCalled();
    expect(result.context).toContain('from fields');
    expect(result.context).toContain('test-svc');
    expect(result.context).not.toContain('nullField');
  });

  it('skips trace fetch when using fields without trace.id or timestamp', async () => {
    const fields = { message: 'no trace info' };

    await getLogAiInsights(createBaseParams({ fields }));

    expect(getTraces).not.toHaveBeenCalled();
  });
});
