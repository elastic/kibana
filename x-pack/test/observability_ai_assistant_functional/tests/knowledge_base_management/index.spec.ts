/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import os from 'os';
import fs from 'fs';
import path from 'path';
import {
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/model_and_inference';
import { clearKnowledgeBase } from '../../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/knowledge_base';
import { ObservabilityAIAssistantApiClient } from '../../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/observability_ai_assistant_api_client';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ApiTest({ getService, getPageObjects }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const es = getService('es');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');
  const toasts = getService('toasts');

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

    describe('User instruction management', () => {
      async function openUserInstructionFlyout() {
        await testSubjects.click(ui.pages.kbManagementTab.editUserInstructionButton);
        await testSubjects.exists(ui.pages.kbManagementTab.saveEntryButton);
      }

      async function getUserInstructionContent() {
        const editor = await find.byCssSelector(`#${ui.pages.kbManagementTab.entryMarkdownEditor}`);
        return await retry.try(async () => {
          const value = await editor.getAttribute('value');
          if (!value) {
            throw new Error('Content not loaded yet');
          }
          return value;
        });
      }

      async function setUserInstructionContent(content?: string) {
        const editor = await find.byCssSelector(`#${ui.pages.kbManagementTab.entryMarkdownEditor}`);
        await editor.clearValue();
        if (content) {
          await editor.type(content);
        }
      }

      before(async () => {
        await clearKnowledgeBase(es);
        await common.navigateToUrlWithBrowserHistory(
          'management',
          '/kibana/observabilityAiAssistantManagement',
          'tab=knowledge_base'
        );
      });

      beforeEach(async () => {
        await clearKnowledgeBase(es);
        await browser.refresh();
      });

      afterEach(async () => {
        await clearKnowledgeBase(es);
        await browser.refresh();
      });

      after(async () => {
        await clearKnowledgeBase(es);
      });

      it('creates a new user instruction', async () => {
        await openUserInstructionFlyout();
        const instruction = 'Always respond in a formal tone';
        await setUserInstructionContent(instruction);
        await testSubjects.click(ui.pages.kbManagementTab.saveEntryButton);

        // Re-open to verify content was saved
        await openUserInstructionFlyout();
        const savedContent = await getUserInstructionContent();
        expect(savedContent).to.eql(instruction);
      });

      it('cancels editing without saving changes when the cancel button is clicked', async () => {
        // First create an instruction
        await openUserInstructionFlyout();
        const originalInstruction = 'Original instruction';
        await setUserInstructionContent(originalInstruction);
        await testSubjects.click(ui.pages.kbManagementTab.saveEntryButton);

        // Make changes but cancel
        await openUserInstructionFlyout();
        await toasts.dismissAll();
        await setUserInstructionContent('Changed instruction');
        await testSubjects.click(ui.pages.kbManagementTab.editEntryCancelButton);

        // Verify the original content remains unchanged
        await openUserInstructionFlyout();
        const savedContent = await getUserInstructionContent();
        expect(savedContent).to.eql(originalInstruction);
      });
    });

    describe('Bulk import knowledge base entries', () => {
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, 'bulk_import.ndjson');

      async function prepareBulkImportData() {
        const entries = [
          { id: '1', title: 'Testing 1', text: 'Contents of first item' },
          { id: '2', title: 'Testing 2', text: 'Contents of second item' },
          { id: '3', title: 'Testing 3', text: 'Contents of third item' },
        ];

        return entries;
      }

      async function getKnowledgeBaseEntryCount() {
        await common.navigateToUrlWithBrowserHistory(
          'management',
          '/kibana/observabilityAiAssistantManagement',
          'tab=knowledge_base'
        );

        const entryTitleCells = await testSubjects.findAll(ui.pages.kbManagementTab.tableTitleCell);
        return entryTitleCells.length;
      }

      async function openBulkImportFlyout() {
        await testSubjects.click(ui.pages.kbManagementTab.newEntryButton);
        await testSubjects.exists(ui.pages.kbManagementTab.bulkImportEntryButton);
        await testSubjects.click(ui.pages.kbManagementTab.bulkImportEntryButton);
      }

      async function uploadBulkImportFile(content: string) {
        fs.writeFileSync(tempFilePath, content, 'utf8');

        log.debug(`File saved to: ${tempFilePath}`);

        try {
          await common.setFileInputPath(tempFilePath);
        } catch (error) {
          log.debug(`Error uploading file: ${error}`);
          throw error;
        }
        return tempFilePath;
      }

      before(async () => {
        await clearKnowledgeBase(es);
        await common.navigateToUrlWithBrowserHistory(
          'management',
          '/kibana/observabilityAiAssistantManagement',
          'tab=knowledge_base'
        );
      });

      beforeEach(async () => {
        await clearKnowledgeBase(es);
        await browser.refresh();
      });

      afterEach(async () => {
        await clearKnowledgeBase(es);
        await browser.refresh();
        fs.unlinkSync(tempFilePath);
      });

      after(async () => {
        await clearKnowledgeBase(es);
      });

      it('successfully imports multiple entries from a NDJSON file', async () => {
        const initialCount = await getKnowledgeBaseEntryCount();
        expect(initialCount).to.eql(0);

        await openBulkImportFlyout();

        const entries = await prepareBulkImportData();
        await uploadBulkImportFile(entries.map((entry) => JSON.stringify(entry)).join('\n'));

        await testSubjects.click(ui.pages.kbManagementTab.bulkImportSaveButton);

        const toast = await testSubjects.find(ui.pages.kbManagementTab.toastTitle);
        const toastText = await toast.getVisibleText();
        expect(toastText).to.eql('Successfully imported ' + entries.length + ' items');

        const finalCount = await getKnowledgeBaseEntryCount();
        expect(finalCount).to.eql(entries.length);
      });

      it('displays validation errors when invalid data is imported', async () => {
        await openBulkImportFlyout();
        await uploadBulkImportFile("{ title: 'Invalid Entry' ");

        await testSubjects.click(ui.pages.kbManagementTab.bulkImportSaveButton);

        const toast = await testSubjects.find(ui.pages.kbManagementTab.toastTitle);
        const toastText = await toast.getVisibleText();
        expect(toastText).to.eql('Something went wrong');

        const count = await getKnowledgeBaseEntryCount();
        expect(count).to.eql(0);
      });

      it('cancels import without saving entries when the cancel button is clicked', async () => {
        await openBulkImportFlyout();

        const entries = await prepareBulkImportData();
        await uploadBulkImportFile(JSON.stringify(entries));

        await testSubjects.click(ui.pages.kbManagementTab.bulkImportCancelButton);

        await testSubjects.missingOrFail(ui.pages.kbManagementTab.bulkImportFlyout);
        const count = await getKnowledgeBaseEntryCount();
        expect(count).to.eql(0);
      });
    });
  });
}
