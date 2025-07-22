/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import fs from 'fs';
import path from 'path';

import expect from '@kbn/expect';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { chatClient, esClient, kibanaClient } from '../../services';

describe('Playground APIs', function () {
  before(async () => {
    // Create the index
    await esClient.indices.create({
      index: 'work-from-home-policies',
      mappings: {
        properties: {
          date: { type: 'date' },
          kb_doc: { type: 'keyword' },
          user: { type: 'keyword' },
          content: { type: 'text' },
          summary: { type: 'text' },
          name: { type: 'keyword' },
          url: { type: 'keyword' },
          created_on: { type: 'date' },
          updated_at: { type: 'date' },
          category: { type: 'keyword' },
        },
      },
    });

    // Read and bulk ingest documents from JSON
    const docs = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'workplace_documents.json'), 'utf-8')
    );

    const body = docs.flatMap((doc: any) => [
      { index: { _index: 'work-from-home-policies' } },
      doc,
    ]);
    await esClient.bulk({ refresh: true, body });
  });

  it('provides a response based on indexed documents', async () => {
    const response = await kibanaClient.callKibana(
      'post',
      { pathname: '/internal/search_playground/chat' },
      {
        data: {
          connector_id: 'e31e2627-57ce-42b6-b23d-b59faad9fe96',
          indices: 'work-from-home-policies',
          prompt: 'You are an assistant for question-answering tasks.',
          citations: true,
          elasticsearch_query:
            '{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["content"]}}}}}',
          summarization_model: 'anthropic.claude-3-haiku-20240307-v1:0',
          doc_size: 1,
          source_fields: '{"work-from-home-policies":["content"]}',
        },
        messages: [{ role: 'human', content: 'Remote Work' }],
      }
    );

    const chatMessages = [
      {
        role: MessageRole.User,
        content: response.data as string,
        data: response.data as string,
      },
    ];

    const result = await chatClient.evaluate(
      {
        messages: chatMessages,
        errors: [],
      },
      [
        'The assistant gave good information about remote work',
        'The assistant cited the source of the information',
        'The assitant provided document source',
      ]
    );

    expect(result.passed).to.be(true);
  });

  it('fails to answer a question because the assistant does not have enough context', async () => {
    const response = await kibanaClient.callKibana(
      'post',
      { pathname: '/internal/search_playground/chat' },
      {
        data: {
          connector_id: 'e31e2627-57ce-42b6-b23d-b59faad9fe96',
          indices: 'work-from-home-policies',
          prompt: 'You are an assistant for question-answering tasks.',
          citations: true,
          elasticsearch_query:
            '{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["content"]}}}}}',
          summarization_model: 'anthropic.claude-3-haiku-20240307-v1:0',
          doc_size: 1,
          source_fields: '{"work-from-home-policies":["content"]}',
        },
        messages: [{ role: 'human', content: 'National Parks' }],
      }
    );

    const chatMessages = [
      {
        role: MessageRole.User,
        content: response.data as string,
        data: response.data as string,
      },
    ];

    const result = await chatClient.evaluate(
      {
        messages: chatMessages,
        errors: [],
      },
      ['The assistant does not have enough context to answer the question']
    );

    expect(result.passed).to.be(true);
  });

  after(async () => {
    await esClient.indices.delete({
      index: 'work-from-home-policies',
    });
  });
});
