/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { chatClient, esClient, kibanaClient } from '../../services';

describe('Elasticsearch function', () => {
  describe('index management', () => {
    describe('existing index', () => {
      before(async () => {
        await esClient.indices.create({
          index: 'kb',
          mappings: {
            properties: {
              date: {
                type: 'date',
              },
              kb_doc: {
                type: 'keyword',
              },
              user: {
                type: 'keyword',
              },
            },
          },
        });

        await esClient.index({
          index: 'kb',
          document: {
            date: '2024-01-23T12:30:00.000Z',
            kb_doc: 'document_1',
            user: 'user1',
          },
        });
      });

      it('provides a response based on indexed documents', async () => {
        const response = await kibanaClient.callKibana(
          'post',
          { pathname: '/internal/search_playground/chat' },
          {
            data: {
              connector_id: 'e31e2627-57ce-42b6-b23d-b59faad9fe96',
              indices: 'search-azwv',
              prompt: 'You are an assistant for question-answering tasks.',
              citations: true,
              elasticsearch_query:
                '{"retriever":{"standard":{"query":{"match_all":{}}}},"highlight":{"fields":{"text":{"type":"semantic","number_of_fragments":2,"order":"score"}}}}',
              summarization_model: 'anthropic.claude-3-haiku-20240307-v1:0',
              doc_size: 1,
              source_fields: '{"search-azwv":["text"]}',
            },
            messages: [{ role: 'human', content: 'Yellowstone' }],
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
            'The assistant gave good description of Yellowstone National Park',
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
              indices: 'search-azwv',
              prompt: 'You are an assistant for question-answering tasks.',
              citations: true,
              elasticsearch_query:
                '{"retriever":{"standard":{"query":{"match_all":{}}}},"highlight":{"fields":{"text":{"type":"semantic","number_of_fragments":2,"order":"score"}}}}',
              summarization_model: 'anthropic.claude-3-haiku-20240307-v1:0',
              doc_size: 1,
              source_fields: '{"search-azwv":["text"]}',
            },
            messages: [{ role: 'human', content: 'Die hard' }],
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
          index: 'kb',
        });
      });
    });
  });
});
