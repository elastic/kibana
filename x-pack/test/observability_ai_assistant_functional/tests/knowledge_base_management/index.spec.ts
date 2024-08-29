/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import {
  createKnowledgeBaseModel,
  deleteKnowledgeBaseModel,
} from '../../../observability_ai_assistant_api_integration/tests/knowledge_base/helpers';
import { ObservabilityAIAssistantApiClient } from '../../../observability_ai_assistant_api_integration/common/observability_ai_assistant_api_client';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ApiTest({ getService, getPageObjects }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const ml = getService('ml');
  const { common } = getPageObjects(['common']);

  async function saveKbEntry({
    apiClient,
    docId,
    text,
  }: {
    apiClient: ObservabilityAIAssistantApiClient;
    docId: string;
    text: string;
  }) {
    return apiClient({
      endpoint: 'POST /internal/observability_ai_assistant/functions/summarize',
      params: {
        body: {
          doc_id: docId,
          text,
          confidence: 'high',
          is_correction: false,
          public: false,
          labels: {},
        },
      },
    }).expect(200);
  }

  describe('Knowledge management tab', () => {
    before(async () => {
      await createKnowledgeBaseModel(ml);

      await Promise.all([
        observabilityAIAssistantAPIClient
          .editor({ endpoint: 'POST /internal/observability_ai_assistant/kb/setup' })
          .expect(200),
        ui.auth.login('editor'),
      ]);

      await common.navigateToUrlWithBrowserHistory(
        'management',
        '/kibana/observabilityAiAssistantManagement',
        'tab=knowledge_base'
      );
    });

    after(async () => {
      await Promise.all([deleteKnowledgeBaseModel(ml), ui.auth.logout()]);
    });

    describe('when the LLM calls the "summarize" function for two different users', () => {
      let rowsWithFavColor: Array<{
        rowText: string[];
        authorText: string;
        entryTitleText: string;
      }>;

      before(async () => {
        await saveKbEntry({
          apiClient: observabilityAIAssistantAPIClient.editor,
          docId: 'my_fav_color',
          text: 'My favourite color is red',
        });

        await saveKbEntry({
          apiClient: observabilityAIAssistantAPIClient.secondaryEditor,
          docId: 'my_fav_color',
          text: 'My favourite color is blue',
        });

        const entryTitleCells = await testSubjects.findAll(ui.pages.kbManagementTab.tableTitleCell);

        const rows = await Promise.all(
          entryTitleCells.map(async (cell) => {
            const entryTitleText = await cell.getVisibleText();
            const parentRow = await cell.findByXpath('ancestor::tr');

            const author = await parentRow.findByCssSelector(
              testSubjSelector(ui.pages.kbManagementTab.tableAuthorCell)
            );
            const authorText = await author.getVisibleText();
            const rowText = (await parentRow.getVisibleText()).split('\n');

            return { rowText, authorText, entryTitleText };
          })
        );

        log.debug(`Found ${rows.length} rows in the KB management table: ${JSON.stringify(rows)}`);

        rowsWithFavColor = rows.filter(({ entryTitleText }) => entryTitleText === 'my_fav_color');
      });

      it('shows two entries', async () => {
        expect(rowsWithFavColor.length).to.eql(2);
      });

      it('shows two different authors', async () => {
        expect(rowsWithFavColor.map(({ authorText }) => authorText)).to.eql([
          'secondary_editor',
          'editor',
        ]);
      });
    });
  });
}
