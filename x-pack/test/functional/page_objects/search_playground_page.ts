/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SearchPlaygroundPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const findService = getService('find');
  const browser = getService('browser');
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const selectIndex = async () => {
    await testSubjects.existOrFail('addDataSourcesButton');
    await testSubjects.click('addDataSourcesButton');
    await testSubjects.existOrFail('selectIndicesFlyout');
    await testSubjects.click('sourceIndex-0');
    await testSubjects.clickWhenNotDisabled('saveButton');
  };
  const selectIndexByName = async (indexName: string) => {
    await testSubjects.existOrFail('addDataSourcesButton');
    await testSubjects.click('addDataSourcesButton');
    await testSubjects.existOrFail('selectIndicesFlyout');
    await findService.clickByCssSelector(`li[title="${indexName}"]`);
    await testSubjects.clickWhenNotDisabled('saveButton');
  };

  const SESSION_KEY = 'search_playground_session';

  return {
    session: {
      async clearSession(): Promise<void> {
        await browser.setLocalStorageItem(SESSION_KEY, '{}');
      },

      async setSession(): Promise<void> {
        await browser.setLocalStorageItem(
          SESSION_KEY,
          JSON.stringify({
            prompt: 'You are a fireman in london that helps answering question-answering tasks.',
          })
        );
      },

      async expectSession(): Promise<void> {
        let state: Record<string, unknown> = {};
        await retry.try(
          async () => {
            const session = (await browser.getLocalStorageItem(SESSION_KEY)) || '{}';
            state = JSON.parse(session);
            expect(Object.keys(state).length).to.be.greaterThan(0, 'Session state has no keys');
          },
          undefined,
          200
        );

        expect(state.prompt).to.be('You are an assistant for question-answering tasks.');
        expect(state.doc_size).to.be(3);
        expect(state.elasticsearch_query).eql({
          retriever: {
            standard: { query: { multi_match: { query: '{query}', fields: ['baz'] } } },
          },
        });
      },

      async expectInSession(key: string, value: string | undefined): Promise<void> {
        const session = (await browser.getLocalStorageItem(SESSION_KEY)) || '{}';
        const state = JSON.parse(session);
        expect(state[key]).to.be(value);
      },
    },
    async expectPageSelectorToExist() {
      await testSubjects.existOrFail('page-mode-select');
    },
    async expectPageModeToBeSelected(mode: 'chat' | 'search') {
      await testSubjects.existOrFail('page-mode-select');
      const selectedModeText = await testSubjects.getAttribute('page-mode-select', 'value');
      expect(selectedModeText?.toLowerCase()).to.be(mode);
    },
    async selectPageMode(mode: 'chat' | 'search') {
      await testSubjects.existOrFail('page-mode-select');
      await testSubjects.selectValue('page-mode-select', mode);
      const selectedModeText = await testSubjects.getAttribute('page-mode-select', 'value');
      expect(selectedModeText?.toLowerCase()).to.be(mode);
    },
    PlaygroundStartChatPage: {
      async expectPlaygroundStartChatPageComponentsToExist() {
        await testSubjects.existOrFail('setupPage');
        await testSubjects.existOrFail('connectLLMButton');
        await testSubjects.existOrFail('createIndexButton');
        await testSubjects.existOrFail('uploadFileButton');
      },
      async expectPlaygroundLLMConnectorOptionsExists() {
        await testSubjects.existOrFail('create-connector-flyout');
        await testSubjects.existOrFail('.gemini-card');
        await testSubjects.existOrFail('.bedrock-card');
        await testSubjects.existOrFail('.gen-ai-card');
      },

      async expectPlaygroundStartChatPageIndexCalloutExists() {
        await testSubjects.existOrFail('createIndexCallout');
      },

      async expectPlaygroundHeaderComponentsToExist() {
        await testSubjects.existOrFail('playground-header-actions');
        await testSubjects.existOrFail('playground-documentation-link');
      },

      async expectPlaygroundHeaderComponentsToDisabled() {
        expect(await testSubjects.getAttribute('viewModeSelector', 'disabled')).to.be('true');
        expect(await testSubjects.isEnabled('uploadFileButton')).to.be(true);
        expect(await testSubjects.isEnabled('dataSourceActionButton')).to.be(false);
        expect(await testSubjects.isEnabled('viewCodeActionButton')).to.be(false);
      },

      async expectCreateIndexButtonToExists() {
        await testSubjects.existOrFail('createIndexButton');
      },

      async expectOpenFlyoutAndSelectIndex() {
        await browser.refresh();
        await selectIndex();
      },
      async expectDataSourcesButtonToBeSuccess() {
        await testSubjects.existOrFail('dataSourcesSuccessButton');
      },
      async expectToSelectIndicesAndLoadChat() {
        await selectIndex();
        await testSubjects.existOrFail('chatPage');
      },
      async expectSelectingIndicesWithNoFieldtoShowError() {
        await testSubjects.existOrFail('addDataSourcesButton');
        await testSubjects.click('addDataSourcesButton');
        await testSubjects.existOrFail('selectIndicesFlyout');
        await testSubjects.click('sourceIndex-0');
        await testSubjects.existOrFail('NoIndicesFieldsMessage');
        expect(await testSubjects.isEnabled('saveButton')).to.be(false);
      },
      async clickConnectLLMButton() {
        await testSubjects.existOrFail('connectLLMButton');
        await testSubjects.click('connectLLMButton');
      },
      async createConnectorFlyoutIsVisible() {
        await testSubjects.existOrFail('create-connector-flyout');
        await testSubjects.existOrFail('.inference-card');
        await testSubjects.existOrFail('.bedrock-card');
        await testSubjects.existOrFail('.gemini-card');
        await testSubjects.existOrFail('.gen-ai-card');
      },
      async createOpenAiConnector(connectorName: string) {
        await testSubjects.existOrFail('.gen-ai-card');
        await testSubjects.click('.gen-ai-card');

        await testSubjects.existOrFail('create-connector-flyout-header');
        const headerValue = await testSubjects.getVisibleText('create-connector-flyout-header');
        expect(headerValue).to.contain('OpenAI connector');
        await testSubjects.existOrFail('nameInput');
        await testSubjects.setValue('nameInput', connectorName);

        const openaiProvider = await testSubjects.getVisibleText('config.apiProvider-select');
        expect(openaiProvider).to.contain('OpenAI');

        await testSubjects.existOrFail('secrets.apiKey-input');
        await testSubjects.setValue('secrets.apiKey-input', 'apiKey');
        await testSubjects.existOrFail('create-connector-flyout-save-btn');
        await testSubjects.click('create-connector-flyout-save-btn');
        await testSubjects.existOrFail('euiToastHeader');
      },
      async clickCreateIndex() {
        await testSubjects.existOrFail('createIndexButton');
        expect(await testSubjects.isEnabled('createIndexButton')).equal(true);
        await testSubjects.click('createIndexButton');
      },

      async searchConnector(connectorName: string) {
        const searchBox = await findService.byCssSelector(
          '[data-test-subj="actionsList"] .euiFieldSearch'
        );
        await searchBox.click();
        await searchBox.clearValue();
        await searchBox.type(connectorName);
        await searchBox.pressKeys(browser.keys.ENTER);
        const s = await findService.byCssSelector(
          '.euiBasicTable[data-test-subj="actionsTable"] .euiTableCellContent__text'
        );
        expect(await s.getVisibleText()).to.be(connectorName);
      },
      async deleteConnector(connectorName: string) {
        await this.searchConnector(connectorName);
        await testSubjects.click('deleteConnector');
        await testSubjects.existOrFail('deleteIdsConfirmation');
        await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
        await testSubjects.missingOrFail('deleteIdsConfirmation');
      },
      async expectSuccessButtonAfterCreatingConnector(createConnector: () => Promise<void>) {
        await createConnector();
        await browser.refresh();
        await testSubjects.existOrFail('successConnectLLMText');
      },

      async expectShowSuccessLLMText() {
        await testSubjects.existOrFail('successConnectLLMText');
      },
    },
    PlaygroundChatPage: {
      async navigateToChatPage() {
        await selectIndex();
        await testSubjects.existOrFail('chatPage');
      },

      async expectPromptToBe(text: string) {
        await testSubjects.existOrFail('instructionsPrompt');
        const instructionsPromptElement = await testSubjects.find('instructionsPrompt');
        const promptInstructions = await instructionsPromptElement.getVisibleText();
        expect(promptInstructions).to.contain(text);
      },
      async expectChatWindowLoaded() {
        expect(await testSubjects.getAttribute('viewModeSelector', 'disabled')).to.be(null);
        expect(await testSubjects.isEnabled('dataSourceActionButton')).to.be(true);
        expect(await testSubjects.isEnabled('viewCodeActionButton')).to.be(true);

        expect(await testSubjects.isEnabled('regenerateActionButton')).to.be(false);
        expect(await testSubjects.isEnabled('clearChatActionButton')).to.be(false);
        expect(await testSubjects.isEnabled('sendQuestionButton')).to.be(false);

        await testSubjects.existOrFail('questionInput');
        const model = await testSubjects.find('summarizationModelSelect');
        const defaultModel = await model.getVisibleText();

        expect(defaultModel).to.equal('OpenAI GPT-4o');
        expect(defaultModel).not.to.be.empty();

        expect(
          await (await testSubjects.find('manageConnectorsLink')).getAttribute('href')
        ).to.contain('/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/');

        await testSubjects.existOrFail('editContextPanel');
        await testSubjects.existOrFail('summarizationPanel');
      },
      async expectCanRegenerateQuestion() {
        await testSubjects.existOrFail('regenerateActionButton');
        await (await testSubjects.find('regenerateActionButton')).click();
        await this.expectChatWorks();
      },
      async clearChat() {
        await testSubjects.existOrFail('clearChatActionButton');
        expect(await testSubjects.isEnabled('clearChatActionButton')).to.be(true);
        await (await testSubjects.find('clearChatActionButton')).click();

        const userMessageElement = await testSubjects.find('systemMessage');
        const userMessage = await userMessageElement.getVisibleText();
        expect(userMessage).to.contain('Welcome! Ask a question to get started.');
      },

      async updatePrompt(prompt: string) {
        await testSubjects.setValue('instructionsPrompt', prompt, { clearWithKeyboard: true });
      },

      async updateQuestion(question: string) {
        await testSubjects.setValue('questionInput', question, { clearWithKeyboard: true });
      },

      async expectQuestionInputToBeEmpty() {
        const questionInput = await testSubjects.find('questionInput');
        const question = await questionInput.getAttribute('value');
        expect(question).to.be.empty();
      },

      async sendQuestion() {
        await testSubjects.setValue('questionInput', 'test question');
        await testSubjects.click('sendQuestionButton');
      },

      async expectChatWorks() {
        const userMessageElement = await testSubjects.find('userMessage');
        const userMessage = await userMessageElement.getVisibleText();
        expect(userMessage).to.contain('test question');

        const assistantMessageElement = await testSubjects.find('assistant-message');
        const assistantMessage = await assistantMessageElement.getVisibleText();
        expect(assistantMessage).to.contain('My response');
      },

      async expectTokenTooltipExists() {
        await testSubjects.existOrFail('token-tooltip-button');
      },

      async expectOpenViewCode() {
        await testSubjects.click('viewCodeActionButton');
        await testSubjects.existOrFail('viewCodeFlyout');
        await testSubjects.click('euiFlyoutCloseButton');
      },

      async expectCanChangeCitations() {
        await testSubjects.existOrFail('includeCitationsToggle');
        expect(
          await testSubjects.isEuiSwitchChecked(await testSubjects.find('includeCitationsToggle'))
        ).to.be(true);
        await (await testSubjects.find('includeCitationsToggle')).click();
        expect(
          await testSubjects.isEuiSwitchChecked(await testSubjects.find('includeCitationsToggle'))
        ).to.be(false);
      },
      async expectCanChangeNumberOfDocumentsSent() {
        await testSubjects.existOrFail('playground_context_doc_number-3');
        expect(
          await (
            await testSubjects.find('playground_context_doc_number-3')
          ).getAttribute('aria-pressed')
        ).to.be('true');
        await testSubjects.existOrFail('playground_context_doc_number-10');
        await (await testSubjects.find('playground_context_doc_number-10')).click();
        expect(
          await (
            await testSubjects.find('playground_context_doc_number-10')
          ).getAttribute('aria-pressed')
        ).to.be('true');
        expect(
          await (
            await testSubjects.find('playground_context_doc_number-3')
          ).getAttribute('aria-pressed')
        ).to.be('false');
      },
      async openQueryMode() {
        await testSubjects.existOrFail('queryMode');
        await testSubjects.click('queryMode');
      },

      async openChatMode() {
        await testSubjects.existOrFail('chatMode');
        await testSubjects.click('chatMode');
      },

      async expectEditContextOpens(
        indexName: string = 'basic_index',
        expectedSelectedFields: string[] = ['baz']
      ) {
        await testSubjects.click('chatMode');
        await testSubjects.existOrFail(`contextFieldsSelectable-${indexName}`);
        for (const field of expectedSelectedFields) {
          await testSubjects.existOrFail(`contextField-${field}`);
        }
        expect(
          await comboBox.doesComboBoxHaveSelectedOptions(`contextFieldsSelectable-${indexName}`)
        ).to.be(true);
        expect(
          await comboBox.getComboBoxSelectedOptions(`contextFieldsSelectable-${indexName}`)
        ).to.eql(expectedSelectedFields);
      },

      async editContext(indexName: string = 'basic_index', fieldToRemove: string) {
        await testSubjects.click('chatMode');
        await testSubjects.existOrFail(`contextField-${fieldToRemove}`);
        const wrapper = await testSubjects.find(`contextField-${fieldToRemove}`);
        await (
          await wrapper.findByCssSelector(
            `[aria-label="Remove ${fieldToRemove} from selection in this group"]`
          )
        ).click();
        expect(
          await comboBox.getComboBoxSelectedOptions(`contextFieldsSelectable-${indexName}`)
        ).to.eql(['bar', 'baz', 'baz.keyword', 'foo', 'nestedField']);
      },
      async expectSaveFieldsBetweenModes() {
        await testSubjects.click('queryMode');
        await testSubjects.existOrFail('field-baz-true');
        await testSubjects.click('field-baz-true');
        await testSubjects.existOrFail('field-baz-false');
        await testSubjects.click('chatMode');
        await testSubjects.click('queryMode');
        await testSubjects.existOrFail('field-baz-false');
        await testSubjects.click('field-baz-false');
        await testSubjects.existOrFail('field-baz-true');
        await testSubjects.click('chatMode');
      },

      async clickManageButton() {
        await testSubjects.existOrFail('manageConnectorsLink');
        await testSubjects.click('manageConnectorsLink');
        await browser.switchTab(1);
        await testSubjects.existOrFail('edit-connector-flyout');
        await browser.closeCurrentWindow();
        await browser.switchTab(0);
      },
    },
    PlaygroundStartSearchPage: {
      async expectPlaygroundStartSearchPageComponentsToExist() {
        await testSubjects.existOrFail('setupPage');
        await testSubjects.existOrFail('addDataSourcesButton');
      },
      async expectToSelectIndicesAndLoadSearch(indexName: string) {
        await selectIndexByName(indexName);
        await testSubjects.existOrFail('playground-search-section');
      },
    },
    PlaygroundSearchPage: {
      async expectSearchBarToExist() {
        await testSubjects.existOrFail('playground-search-section');
        await testSubjects.existOrFail('searchPlaygroundSearchModeFieldText');
      },
      async executeSearchQuery(queryText: string) {
        await testSubjects.existOrFail('searchPlaygroundSearchModeFieldText');
        await testSubjects.setValue('searchPlaygroundSearchModeFieldText', `${queryText}`, {
          typeCharByChar: true,
        });
        const searchInput = await testSubjects.find('searchPlaygroundSearchModeFieldText');
        await searchInput.pressKeys(browser.keys.ENTER);
      },
      async expectSearchResultsToExist() {
        await testSubjects.existOrFail('search-index-documents-result');
      },
      async expectSearchResultsNotToExist() {
        await testSubjects.missingOrFail('search-index-documents-result');
      },
      async clearSearchInput() {
        await testSubjects.existOrFail('searchPlaygroundSearchModeFieldText');
        await testSubjects.setValue('searchPlaygroundSearchModeFieldText', '');
      },
      async hasModeSelectors() {
        await testSubjects.existOrFail('chatMode');
        await testSubjects.existOrFail('queryMode');
      },
      async expectModeIsSelected(mode: 'chatMode' | 'queryMode') {
        await testSubjects.existOrFail(mode);
        const modeSelectedValue = await testSubjects.getAttribute(mode, 'aria-pressed');
        expect(modeSelectedValue).to.be('true');
      },
      async selectPageMode(mode: 'chatMode' | 'queryMode') {
        await testSubjects.existOrFail(mode);
        await testSubjects.click(mode);
        switch (mode) {
          case 'queryMode':
            expect(await browser.getCurrentUrl()).contain('/app/search_playground/search/query');
            break;
          case 'chatMode':
            const url = await browser.getCurrentUrl();
            expect(url).contain('/app/search_playground/search');
            expect(url).not.contain('/app/search_playground/search/query');
            break;
        }
      },
      async expectQueryModeComponentsToExist() {
        await testSubjects.existOrFail('queryModeSection');
        await testSubjects.existOrFail('RunElasticsearchQueryButton');
        await testSubjects.existOrFail('ViewElasticsearchQueryResult');
        await testSubjects.existOrFail('queryModeSection');
      },
      async expectQueryModeResultsEmptyState() {
        await testSubjects.existOrFail('ViewElasticsearchQueryResponseEmptyState');
      },
      async expectQueryModeResultsCodeEditor() {
        await testSubjects.existOrFail('ViewElasticsearchQueryResponse');
      },
      async runQueryInQueryMode(queryText: string) {
        await testSubjects.existOrFail('searchPlaygroundSearchModeFieldText');
        await testSubjects.setValue('searchPlaygroundSearchModeFieldText', `${queryText}`);
        await testSubjects.click('RunElasticsearchQueryButton');
      },
      async expectFieldToBeSelected(fieldName: string) {
        await testSubjects.existOrFail(`field-${fieldName}-true`);
      },
      async expectFieldNotToBeSelected(fieldName: string) {
        await testSubjects.existOrFail(`field-${fieldName}-false`);
      },
      async clickFieldSwitch(fieldName: string, selected: boolean) {
        await testSubjects.existOrFail(`field-${fieldName}-${selected}`);
        await testSubjects.click(`field-${fieldName}-${selected}`);
      },
      async getQueryEditorText() {
        await testSubjects.existOrFail('ViewElasticsearchQueryResult');
        const result = await testSubjects.getVisibleTextAll('ViewElasticsearchQueryResult');
        expect(Array.isArray(result)).to.be(true);
        expect(result.length).to.be(1);
        expect(typeof result[0]).to.be('string');
        return result[0];
      },
    },
    PlaygroundQueryPage: {
      async openQueryMode() {
        await testSubjects.existOrFail('queryMode');
        await testSubjects.click('queryMode');
      },

      async expectQueryCodeToBe(text: string) {
        await testSubjects.existOrFail('ViewElasticsearchQueryResult');
        const codeEditor = await testSubjects.find('ViewElasticsearchQueryResult');
        const editorViewDiv = await codeEditor.findByClassName('view-lines');
        const code = await editorViewDiv.getVisibleText();
        expect(code.replace(/ /g, '')).to.be(text);
      },

      async expectViewQueryHasFields() {
        const fields = await testSubjects.findAll('fieldName');

        expect(fields.length).to.be(1);

        await this.expectQueryCodeToBe(
          '{\n"retriever":{\n"standard":{\n"query":{\n"multi_match":{\n"query":"{query}",\n"fields":[\n"baz"\n]\n}\n}\n}\n}\n}'
        );
      },

      async expectCanEditElasticsearchQuery(newQuery: string) {
        await testSubjects.existOrFail('ViewElasticsearchQueryResult');
        const codeEditor = await testSubjects.find('ViewElasticsearchQueryResult');
        const editorTextArea = await codeEditor.findByTagName('textarea');
        await editorTextArea.clickMouseButton();
        await editorTextArea.clearValueWithKeyboard();
        await editorTextArea.type(newQuery);
        await this.expectQueryCodeToBe(newQuery);
      },

      async resetElasticsearchQuery() {
        await testSubjects.existOrFail('ResetElasticsearchQueryButton');
        await testSubjects.click('ResetElasticsearchQueryButton');
      },

      async setQueryModeQuestion(question: string) {
        await testSubjects.existOrFail('searchPlaygroundChatQuestionFieldText');
        const questionInput = await testSubjects.find('searchPlaygroundChatQuestionFieldText');
        await questionInput.type(question);
      },

      async expectCanRunQuery() {
        await testSubjects.existOrFail('RunElasticsearchQueryButton');
        await testSubjects.waitForEnabled('RunElasticsearchQueryButton');
        await testSubjects.click('RunElasticsearchQueryButton');

        await testSubjects.existOrFail('ViewElasticsearchQueryResponse');
      },

      async expectQueryModeResultsContains(text: string) {
        await testSubjects.existOrFail('ViewElasticsearchQueryResponse');
        const codeEditor = await testSubjects.find('ViewElasticsearchQueryResponse');
        const editorViewDiv = await codeEditor.findByClassName('view-lines');
        const queryResponse = await editorViewDiv.getVisibleText();
        expect(queryResponse).to.contain(text);
      },
    },
  };
}
