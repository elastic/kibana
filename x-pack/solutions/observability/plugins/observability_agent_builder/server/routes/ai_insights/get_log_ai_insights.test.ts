/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { EMPTY } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { getLogAiInsights, type GetLogAiInsightsParams } from './get_log_ai_insights';

vi.mock('./get_log_document_by_id', () => {
      const mocked = {
      getLogDocumentById: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../tools/get_traces/handler', () => {
      const mocked = {
      getToolHandler: vi.fn().mockResolvedValue({ traces: [] }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../utils/warning_and_above_log_filter', () => {
      const mocked = {
      isWarningOrAbove: vi.fn().mockReturnValue(false),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../utils/get_entity_linking_instructions', () => {
      const mocked = {
      getEntityLinkingInstructions: vi.fn().mockReturnValue(''),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./types', () => {
      const mocked = {
      createAiInsightResult: vi.fn((context: string, _connector: unknown, events$: unknown) => ({
        context,
        events$,
      })),
    };
      return { ...mocked, default: mocked };
    });

const { getLogDocumentById } = (await vi.importMock('./get_log_document_by_id'));
const { getToolHandler: getTraces } = (await vi.importMock('../../tools/get_traces/handler'));

const mockLogger = { debug: vi.fn(), error: vi.fn() } as unknown as Logger;

function createBaseParams(overrides: Partial<GetLogAiInsightsParams> = {}): GetLogAiInsightsParams {
  return {
    core: { http: { basePath: { get: () => '' } } } as any,
    plugins: {} as any,
    inferenceClient: { chatComplete: vi.fn().mockReturnValue(EMPTY) } as any,
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
    vi.clearAllMocks();
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
