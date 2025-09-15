/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import { SECURITY_LABS_KNOWLEDGE_BASE_TOOL } from './security_labs_tool';
import type {
  ContentReferencesStore,
  HrefContentReference,
  KnowledgeBaseEntryContentReference,
} from '@kbn/elastic-assistant-common';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';
import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { Document } from 'langchain/document';
import { getIsKnowledgeBaseInstalled } from '@kbn/elastic-assistant-plugin/server/routes/helpers';
jest.mock('@kbn/elastic-assistant-plugin/server/routes/helpers');
describe('SecurityLabsTool', () => {
  const contentReferencesStore = newContentReferencesStoreMock();
  const getKnowledgeBaseDocumentEntries = jest.fn();
  const kbDataClient = { getKnowledgeBaseDocumentEntries };
  const defaultArgs = {
    isEnabledKnowledgeBase: true,
    contentReferencesStore,
    kbDataClient,
  } as unknown as AssistantToolParams;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DynamicStructuredTool', () => {
    it('includes citations', async () => {
      getKnowledgeBaseDocumentEntries.mockResolvedValue([
        new Document({
          id: '123',
          pageContent: `---
title: "An Elastic approach to large-scale dynamic malware analysis"
slug: "an-elastic-approach-to-large-scale-dynamic-malware-analysis"
date: "2023-07-31"
description: "This research reveals insights into some of the large-scale malware analysis performed by Elastic Security Labs, and complements research related to the Detonate framework."
author:
- slug: ruben-groenewoud
- slug: remco-sprooten
image: "blog-thumb-steel-engine.jpg"
category:
---
## Introduction

In previous publications,`,
        }),
      ]);

      const tool = (await SECURITY_LABS_KNOWLEDGE_BASE_TOOL.getTool(
        defaultArgs
      )) as DynamicStructuredTool;

      (contentReferencesStore.add as jest.Mock).mockImplementation(
        (creator: Parameters<ContentReferencesStore['add']>[0]) => {
          const reference = creator({ id: 'exampleContentReferenceId' });
          expect(reference.type).toEqual('Href');
          expect((reference as HrefContentReference).href).toEqual(
            'https://www.elastic.co/security-labs/an-elastic-approach-to-large-scale-dynamic-malware-analysis'
          );
          expect((reference as HrefContentReference).label).toEqual(
            'Security Labs: An Elastic approach to large-scale dynamic malware analysis'
          );
          return reference;
        }
      );

      const result = await tool.func({ query: 'What is Kibana Security?', product: 'kibana' });

      expect(result).toContain('Citation: {reference(exampleContentReferenceId)}');
    });

    it('includes citations fallback', async () => {
      getKnowledgeBaseDocumentEntries.mockResolvedValue([
        new Document({
          id: '123',
          pageContent: `hello world`,
        }),
      ]);
      const tool = (await SECURITY_LABS_KNOWLEDGE_BASE_TOOL.getTool(
        defaultArgs
      )) as DynamicStructuredTool;

      (contentReferencesStore.add as jest.Mock).mockImplementation(
        (creator: Parameters<ContentReferencesStore['add']>[0]) => {
          const reference = creator({ id: 'exampleContentReferenceId' });
          expect(reference.type).toEqual('KnowledgeBaseEntry');
          expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryId).toEqual(
            'securityLabsId'
          );
          expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryName).toEqual(
            'Elastic Security Labs content'
          );
          return reference;
        }
      );

      const result = await tool.func({ query: 'What is Kibana Security?', product: 'kibana' });

      expect(result).toContain('Citation: {reference(exampleContentReferenceId)}');
    });
    it('Responds with The "AI Assistant knowledge base" needs to be installed... when no docs and no kb install', async () => {
      getKnowledgeBaseDocumentEntries.mockResolvedValue([]);
      (getIsKnowledgeBaseInstalled as jest.Mock).mockResolvedValue(false);
      const tool = (await SECURITY_LABS_KNOWLEDGE_BASE_TOOL.getTool(
        defaultArgs
      )) as DynamicStructuredTool;

      const result = await tool.func({ query: 'What is Kibana Security?', product: 'kibana' });

      expect(result).toContain('The "AI Assistant knowledge base" needs to be installed');
    });
    it('Responds with empty response when no docs and kb is installed', async () => {
      getKnowledgeBaseDocumentEntries.mockResolvedValue([]);
      (getIsKnowledgeBaseInstalled as jest.Mock).mockResolvedValue(true);
      const tool = (await SECURITY_LABS_KNOWLEDGE_BASE_TOOL.getTool(
        defaultArgs
      )) as DynamicStructuredTool;

      const result = await tool.func({ query: 'What is Kibana Security?', product: 'kibana' });

      expect(result).toEqual('[]');
    });
  });
});
