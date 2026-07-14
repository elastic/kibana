/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { getLogAiInsights, type GetLogAiInsightsParams } from './get_log_ai_insights';

jest.mock('./get_log_document_by_id', () => ({
  getLogDocumentById: jest.fn(),
}));

const { getLogDocumentById } = jest.requireMock('./get_log_document_by_id');

function createBaseParams(overrides: Partial<GetLogAiInsightsParams> = {}): GetLogAiInsightsParams {
  return {
    dataRegistry: { getData: jest.fn() } as any,
    inferenceClient: {
      chatComplete: jest.fn().mockResolvedValue({ content: 'mocked summary' }),
    } as any,
    connectorId: 'test-connector',
    request: httpServerMock.createKibanaRequest(),
    esClient: { asCurrentUser: {} } as any,
    ...overrides,
  };
}

describe('getLogAiInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
