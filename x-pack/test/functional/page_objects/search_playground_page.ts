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
  const browser = getService('browser');
  const selectIndex = async () => {
    await testSubjects.existOrFail('addDataSourcesButton');
    await testSubjects.click('addDataSourcesButton');
    await testSubjects.existOrFail('selectIndicesFlyout');
    await testSubjects.click('sourceIndex-0');
    await testSubjects.click('saveButton');
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
        const session = (await browser.getLocalStorageItem(SESSION_KEY)) || '{}';
        const state = JSON.parse(session);
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
    PlaygroundStartChatPage: {
      async expectPlaygroundStartChatPageComponentsToExist() {
        await testSubjects.existOrFail('setupPage');
        await testSubjects.existOrFail('connectLLMButton');
      },

      async expectPlaygroundLLMConnectorOptionsExists() {
        await testSubjects.existOrFail('create-connector-flyout');
        await testSubjects.existOrFail('.gemini-card');
        await testSubjects.existOrFail('.bedrock-card');
        await testSubjects.existOrFail('.gen-ai-card');
      },

      async expectPlaygroundStartChatPageIndexButtonExists() {
        await testSubjects.existOrFail('createIndexButton');
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
        expect(await testSubjects.isEnabled('dataSourceActionButton')).to.be(false);
        expect(await testSubjects.isEnabled('viewCodeActionButton')).to.be(false);
      },

      async expectCreateIndexButtonToExists() {
        await testSubjects.existOrFail('createIndexButton');
      },

      async expectOpenFlyoutAndSelectIndex() {
        await browser.refresh();
        await selectIndex();
        await testSubjects.existOrFail('dataSourcesSuccessButton');
      },

      async expectToSelectIndicesAndLoadChat() {
        await selectIndex();
        await testSubjects.existOrFail('chatPage');
      },

      async expectAddConnectorButtonExists() {
        await testSubjects.existOrFail('connectLLMButton');
      },

      async expectOpenConnectorPagePlayground() {
        await testSubjects.click('connectLLMButton');
        await testSubjects.existOrFail('create-connector-flyout');
      },

      async expectSuccessButtonAfterCreatingConnector(createConnector: () => Promise<void>) {
        await createConnector();
        await browser.refresh();
        await testSubjects.existOrFail('successConnectLLMButton');
      },

      async expectShowSuccessLLMButton() {
        await testSubjects.existOrFail('successConnectLLMButton');
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

        expect(defaultModel).to.equal('OpenAI GPT-3.5 Turbo');
        expect(defaultModel).not.to.be.empty();

        expect(
          await (await testSubjects.find('manageConnectorsLink')).getAttribute('href')
        ).to.contain('/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/');

        await testSubjects.existOrFail('editContextPanel');
        await testSubjects.existOrFail('summarizationPanel');
      },

      async updatePrompt(prompt: string) {
        await testSubjects.setValue('instructionsPrompt', prompt);
      },

      async updateQuestion(question: string) {
        await testSubjects.setValue('questionInput', question);
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

      async expectViewQueryHasFields() {
        await testSubjects.existOrFail('queryMode');
        await testSubjects.click('queryMode');
        const fields = await testSubjects.findAll('fieldName');

        expect(fields.length).to.be(1);

        const codeBlock = await testSubjects.find('ViewElasticsearchQueryResult');
        const code = await codeBlock.getVisibleText();
        expect(code.replace(/ /g, '')).to.be(
          '{\n"retriever":{\n"standard":{\n"query":{\n"multi_match":{\n"query":"{query}",\n"fields":[\n"baz"\n]\n}\n}\n}\n}\n}'
        );

        await testSubjects.click('chatMode');
      },

      async expectEditContextOpens() {
        await testSubjects.click('chatMode');
        await testSubjects.existOrFail('contextFieldsSelectable-0');
        await testSubjects.click('contextFieldsSelectable-0');
        await testSubjects.existOrFail('contextField');
        const fields = await testSubjects.findAll('contextField');

        expect(fields.length).to.be(1);
      },

      async expectSaveFieldsBetweenModes() {
        await testSubjects.click('queryMode');
        await testSubjects.existOrFail('field-baz-true');
        await testSubjects.click('field-baz-true');
        await testSubjects.existOrFail('field-baz-false');
        await testSubjects.click('chatMode');
        await testSubjects.click('queryMode');
        await testSubjects.existOrFail('field-baz-false');
      },
    },
  };
}
