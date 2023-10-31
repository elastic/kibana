/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function canvasExpressionTest({ getService, getPageObjects }: FtrProviderContext) {
  const archive = 'x-pack/test/functional/fixtures/kbn_archiver/canvas/default';
  const browser = getService('browser');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const monacoEditor = getService('monacoEditor');
  const PageObjects = getPageObjects(['canvas']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe('expression editor', function () {
    // there is an issue with FF not properly clicking on workpad elements
    this.tags('skipFirefox');

    before(async () => {
      await kibanaServer.importExport.load(archive);

      // load test workpad
      await PageObjects.canvas.goToListingPage();
      await PageObjects.canvas.loadFirstWorkpad('Test Workpad');
    });

    after(async () => {
      await kibanaServer.importExport.unload(archive);
    });

    it('updates when element is changed via side bar', async () => {
      // wait for all our elements to load up
      await retry.try(async () => {
        const elements = await testSubjects.findAll(
          'canvasWorkpadPage > canvasWorkpadPageElementContent'
        );
        expect(elements).to.have.length(4);
      });

      const codeEditorSubj = 'canvasCodeEditorField';

      // find the first workpad element (a markdown element) and click it to select it
      await testSubjects.click('canvasWorkpadPage > canvasWorkpadPageElementContent', 20000);
      await monacoEditor.waitCodeEditorReady(codeEditorSubj);

      // open the expression editor
      await PageObjects.canvas.openExpressionEditor();
      await monacoEditor.waitCodeEditorReady('canvasExpressionInput');

      // select markdown content and clear it
      const oldMd = await monacoEditor.getCodeEditorValue(0);
      await monacoEditor.setCodeEditorValue('', 0);

      // type the new text
      const newMd = `${oldMd} and this is a test`;
      await monacoEditor.setCodeEditorValue(newMd, 0);

      // make sure the open expression editor also has the changes
      await retry.try(async () => {
        const editorText = await monacoEditor.getCodeEditorValue(1);
        expect(editorText).to.contain('Orange: Timelion, Server function and this is a test');
      });

      // reset the markdown
      await monacoEditor.setCodeEditorValue(oldMd, 0);
    });

    it('does not show autocomplete before typing', async () => {
      await retry.try(async () => {
        const elements = await find.allByCssSelector('.monaco-list-rows > .monaco-list-row');
        expect(elements.length).to.be(0);
      });
    });

    it('shows autocomplete when typing', async () => {
      const originalExpression = await monacoEditor.getCodeEditorValue(1);
      await monacoEditor.setCodeEditorValue(' ', 1);

      // checks that no suggestions are rendered
      await retry.try(async () => {
        const elements = await find.allByCssSelector('.monaco-list-rows > .monaco-list-row');
        expect(elements.length).to.be(0);
      });

      await testSubjects.click('canvasExpressionInput');
      await browser.pressKeys(browser.keys.SPACE);

      // checks that suggestions are rendered after typing
      await retry.try(async () => {
        const elements = await find.allByCssSelector('.monaco-list-rows > .monaco-list-row');
        expect(elements.length).to.be.above(0);
      });

      // reset expression
      await monacoEditor.setCodeEditorValue(originalExpression, 1);
    });
  });
}
