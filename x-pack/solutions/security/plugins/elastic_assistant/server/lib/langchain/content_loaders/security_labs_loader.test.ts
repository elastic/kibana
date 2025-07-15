/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';
import { getSecurityLabsDocsCount, loadSecurityLabs } from './security_labs_loader';
import { loggerMock } from '@kbn/logging-mocks';
import { Document } from 'langchain/document';

const mockKbDataClient = {
  addKnowledgeBaseDocuments: jest.fn().mockResolvedValue([{ foo: 'bar' }]),
} as unknown as AIAssistantKnowledgeBaseDataClient;

describe('security_labs_loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loadSecurityLabs loads decrypted documents', async () => {
    const result = await loadSecurityLabs(mockKbDataClient, loggerMock.create());

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
        expect(documents[0].pageContent).toContain('title');
        expect(documents[0].pageContent).toContain('slug');
      });
    });
  });

  it('getSecurityLabsDocsCount returns correct count', async () => {
    const result = await getSecurityLabsDocsCount({ logger: loggerMock.create() });

    expect(result).toBe(190); // Update this when new Security Labs articles are added
  });
});
