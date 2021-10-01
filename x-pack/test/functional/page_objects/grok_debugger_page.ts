/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class GrokDebuggerPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly aceEditor = this.ctx.getService('aceEditor');
  private readonly retry = this.ctx.getService('retry');

  async simulateButton() {
    return await this.testSubjects.find('btnSimulate');
  }

  async getEventOutput() {
    return await this.aceEditor.getValue(
      'grokDebuggerContainer > aceEventOutput > codeEditorContainer'
    );
  }

  async setEventInput(value: string) {
    await this.aceEditor.setValue(
      'grokDebuggerContainer > aceEventInput > codeEditorContainer',
      value
    );
  }

  async setPatternInput(pattern: string) {
    await this.aceEditor.setValue(
      'grokDebuggerContainer > acePatternInput > codeEditorContainer',
      pattern
    );
  }

  async setCustomPatternInput(customPattern: string) {
    await this.aceEditor.setValue(
      'grokDebuggerContainer > aceCustomPatternsInput > codeEditorContainer',
      customPattern
    );
  }

  async toggleSetCustomPattern() {
    await this.testSubjects.click('grokDebuggerContainer > btnToggleCustomPatternsInput');
  }

  async executeGrokSimulation(input: string, pattern: string, customPattern: string | null) {
    let value;
    await this.setEventInput(input);
    await this.setPatternInput(pattern);
    if (customPattern) {
      await this.toggleSetCustomPattern();
      await this.setCustomPatternInput(customPattern);
    }
    await (await this.simulateButton()).click();
    await this.retry.try(async () => {
      value = JSON.parse(await this.getEventOutput());
      expect(Object.keys(value).length).to.be.greaterThan(0);
    });
    return value;
  }

  // This needs to be fixed to work with the new test functionality. This method is skipped currently.
  async assertPatternInputSyntaxHighlighting(expectedHighlights: any[]) {
    const patternInputElement = await this.testSubjects.find(
      'grokDebuggerContainer > acePatternInput > codeEditorContainer'
    );
    const highlightedElements = await patternInputElement.findAllByXpath(
      './/div[@class="ace_line"]/*'
    );

    expect(highlightedElements.length).to.be(expectedHighlights.length);
    await Promise.all(
      highlightedElements.map(async (element: any, index) => {
        const highlightClass = await element.getAttribute('class');
        const highlightedContent = await element.getVisibleText();

        const expectedHighlight = expectedHighlights[index];
        const expectedHighlightClass = `ace_${expectedHighlight.token}`;
        const expectedHighlightedContent = expectedHighlight.content;

        expect(highlightClass).to.be(expectedHighlightClass);
        expect(highlightedContent).to.be(expectedHighlightedContent);
      })
    );
  }
}
