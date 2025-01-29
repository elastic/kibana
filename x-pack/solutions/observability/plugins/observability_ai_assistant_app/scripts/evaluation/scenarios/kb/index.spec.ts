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

const KB_INDEX = '.kibana-observability-ai-assistant-kb-*';

describe('Knowledge base', () => {
  describe('kb functions', () => {
    it('summarizes and recalls information', async () => {
      let conversation = await chatClient.complete({
        messages:
          'Remember that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
      });

      conversation = await chatClient.complete({
        conversationId: conversation.conversationId!,
        messages: conversation.messages.concat({
          content: 'What is this cluster used for?',
          role: MessageRole.User,
        }),
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the summarize function',
        'Effectively summarizes and remembers that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
        'Calls the "context" function to respond to What is this cluster used for?',
        'Effectively recalls that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
      ]);

      expect(result.passed).to.be(true);
    });

    after(async () => {
      await esClient.deleteByQuery({
        index: KB_INDEX,
        ignore_unavailable: true,
        query: {
          match: {
            text: {
              query: '*Observability AI Evaluation Framework*',
            },
          },
        },
      });
    });
  });

  describe('kb retrieval', () => {
    const testDocs = [
      {
        id: 'doc_invention_1',
        title: 'Quantum Revectorization Engine',
        text: 'The Quantum Revectorization Engine (QRE), invented by Dr. Eliana Stone at Acme Labs in 2023, uses advanced quantum fields to reorder the subatomic structure of materials, effectively reconfiguring matter at a fundamental level. Its main achievement was to transform ordinary silicon wafers into superconductive materials without traditional cooling methods.',
      },
      {
        id: 'doc_invention_2',
        title: 'Constraints of QRE',
        text: 'Current constraints on the Quantum Revectorization Engine technology limit its revectorization radius to approximately 2 nanometers. Additionally, the energy required to maintain the quantum fields is extraordinarily high, necessitating specialized fusion reactors to sustain the process.',
      },
    ];

    before(async () => {
      await kibanaClient.installKnowledgeBase();
      try {
        await esClient.deleteByQuery({
          index: KB_INDEX,
          ignore_unavailable: true,
          query: { match_all: {} },
          refresh: true,
        });
      } catch (error) {
        // ignore error
      }

      // Insert the test documents into KB
      await kibanaClient.callKibana(
        'post',
        { pathname: '/internal/observability_ai_assistant/kb/entries/import' },
        {
          entries: testDocs,
        }
      );
    });

    it('retrieves inventor and purpose of the QRE', async () => {
      const prompt = 'Who invented the Quantum Revectorization Engine and what does it do?';
      const conversation = await chatClient.complete({ messages: prompt });

      const result = await chatClient.evaluate(conversation, [
        'Uses KB retrieval function to find information about the Quantum Revectorization Engine',
        'Correctly identifies Dr. Eliana Stone at Acme Labs in 2023 as the inventor',
        'Accurately describes that it reorders the subatomic structure of materials and can transform silicon wafers into superconductive materials',
        'Does not invent unrelated or hallucinated details not present in the KB',
      ]);

      expect(result.passed).to.be(true);
    });

    it('retrieves constraints and energy requirements of the QRE', async () => {
      const prompt =
        'What is the approximate revectorization radius of the QRE and what kind of reactor is required to power it?';
      const conversation = await chatClient.complete({ messages: prompt });

      const result = await chatClient.evaluate(conversation, [
        'Uses KB retrieval function to find the correct document about QRE constraints',
        'Mentions the 2 nanometer limit on the revectorization radius',
        'Mentions that specialized fusion reactors are needed',
        'Does not mention information unrelated to constraints or energy (i.e., does not mention the inventor or silicon wafer transformation from doc-invention-1)',
      ]);

      expect(result.passed).to.be(true);
    });

    after(async () => {
      await esClient.deleteByQuery({
        index: KB_INDEX,
        ignore_unavailable: true,
        query: {
          match: {
            text: 'Quantum Revectorization Engine',
          },
        },
        refresh: true,
      });
    });
  });
});
