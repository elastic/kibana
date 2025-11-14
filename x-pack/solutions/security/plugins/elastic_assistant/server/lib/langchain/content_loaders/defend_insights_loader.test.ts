/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from 'langchain/document';
import { loggerMock } from '@kbn/logging-mocks';

import type { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';
import { appContextService } from '../../../services/app_context';
import { getDefendInsightsDocsCount, loadDefendInsights } from './defend_insights_loader';

jest.mock('../../../services/app_context');

const mockKbDataClient = {
  addKnowledgeBaseDocuments: jest.fn().mockResolvedValue([{ foo: 'bar' }]),
} as unknown as AIAssistantKnowledgeBaseDataClient;

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getRegisteredFeatures.mockImplementation(() => {
  const original = jest.requireActual('../../../services/app_context');
  return {
    ...original.appContextService.getRegisteredFeatures(),
    defendInsightsPolicyResponseFailure: true,
  };
});

describe('defend_insights_loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loadDefendInsights loads documents', async () => {
    const result = await loadDefendInsights(mockKbDataClient, loggerMock.create());

    expect(result).toBe(true);
    expect(mockKbDataClient.addKnowledgeBaseDocuments).toHaveBeenCalled();

    const args = (mockKbDataClient.addKnowledgeBaseDocuments as jest.Mock).mock.calls as Array<
      Array<{
        documents: Document[];
      }>
    >;

    args.forEach((arg) => {
      arg.forEach(({ documents }) => {
        expect(documents).toHaveLength(1);
        expect(documents[0].pageContent).toContain('---');
        expect(documents[0].pageContent).toContain('action.name');
        expect(documents[0].pageContent).toContain('action.message');
        expect(documents[0].pageContent).toContain('os');
        expect(documents[0].pageContent).toContain('date');
        expect(documents[0].pageContent).toContain('Remediation');
      });
    });
  });

  it('getDefendInsightsDocsCount returns correct count', async () => {
    const result = await getDefendInsightsDocsCount({ logger: loggerMock.create() });

    expect(result).toBe(14);
  });
});
