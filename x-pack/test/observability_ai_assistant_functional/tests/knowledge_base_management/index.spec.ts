/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import {
  clearKnowledgeBase,
  teardownTinyElserModelAndInferenceEndpoint,
  deployTinyElserAndSetupKb,
} from '../../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/knowledge_base';
import { ObservabilityAIAssistantApiClient } from '../../../observability_ai_assistant_api_integration/common/observability_ai_assistant_api_client';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ApiTest({ getService, getPageObjects }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const es = getService('es');
  const { common } = getPageObjects(['common']);

  async function saveKbEntry({
    apiClient,
    text,
  }: {
    apiClient: ObservabilityAIAssistantApiClient;
    text: string;
  }) {
    return apiClient({
      endpoint: 'POST /internal/observability_ai_assistant/functions/summarize',
      params: {
        body: {
          title: 'Favourite color',
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
      await clearKnowledgeBase(es);
      await deployTinyElserAndSetupKb(getService);
      await ui.auth.login('editor');
    });

    after(async () => {
      await Promise.all([
        teardownTinyElserModelAndInferenceEndpoint(getService),
        clearKnowledgeBase(es),
        ui.auth.logout(),
      ]);
    });

    describe('when the LLM calls the "summarize" function for two different users', () => {
      async function getKnowledgeBaseEntries() {
        await common.navigateToUrlWithBrowserHistory(
          'management',
          '/kibana/observabilityAiAssistantManagement',
          'tab=knowledge_base'
        );

        const entryTitleCells = await testSubjects.findAll(ui.pages.kbManagementTab.tableTitleCell);

        const rows = await Promise.all(
          entryTitleCells.map(async (cell) => {
            const title = await cell.getVisibleText();
            const parentRow = await cell.findByXpath('ancestor::tr');

            const authorElm = await parentRow.findByCssSelector(
              testSubjSelector(ui.pages.kbManagementTab.tableAuthorCell)
            );
            const author = await authorElm.getVisibleText();
            const rowText = (await parentRow.getVisibleText()).split('\n');

            return { rowText, author, title };
          })
        );

        log.debug(`Found ${rows.length} rows in the KB management table: ${JSON.stringify(rows)}`);

        return rows.filter(({ title }) => title === 'Favourite color');
      }

      before(async () => {
        await saveKbEntry({
          apiClient: observabilityAIAssistantAPIClient.editor,
          text: 'My favourite color is red',
        });

        await saveKbEntry({
          apiClient: observabilityAIAssistantAPIClient.secondaryEditor,
          text: 'My favourite color is blue',
        });
      });

      it('shows two entries', async () => {
        const entries = await getKnowledgeBaseEntries();
        expect(entries.length).to.eql(2);
      });

      it('shows two different authors', async () => {
        const entries = await getKnowledgeBaseEntries();
        expect(entries.map(({ author }) => author)).to.eql(['secondary_editor', 'editor']);
      });
    });
  });
}
