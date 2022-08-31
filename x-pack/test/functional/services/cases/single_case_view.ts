/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const replaceNewLinesWithSpace = (str: string) => str.replace(/\n/g, ' ');

export function CasesSingleViewServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const header = getPageObject('header');
  const find = getService('find');
  const lensPage = getPageObject('lens');
  const retry = getService('retry');

  return {
    async deleteCase() {
      await common.clickAndValidate('property-actions-ellipses', 'property-actions-trash');
      await common.clickAndValidate('property-actions-trash', 'confirmModalConfirmButton');
      await testSubjects.click('confirmModalConfirmButton');
      await header.waitUntilLoadingHasFinished();
    },

    async verifyUserAction(dataTestSubj: string, contentToMatch: string) {
      const userAction = await find.byCssSelector(
        `[data-test-subj^="${dataTestSubj}"] .euiCommentEvent`
      );

      const userActionText = replaceNewLinesWithSpace(await userAction.getVisibleText());

      expect(userActionText).contain(contentToMatch);
    },

    async getCommentCount(): Promise<number> {
      const commentsContainer = await testSubjects.find('user-actions');
      const comments = await commentsContainer.findAllByClassName('euiComment');
      return comments.length - 1; // don't count the element for adding a new comment
    },

    async submitComment() {
      const commentCountBefore = await this.getCommentCount();
      await testSubjects.click('submit-comment');
      await retry.tryForTime(10 * 1000, async () => {
        const commentCountAfter = await this.getCommentCount();
        expect(commentCountAfter).to.eql(
          commentCountBefore + 1,
          `Number of comments should increase by 1`
        );
      });
    },

    async addVisualization(visName: string) {
      // open saved object finder
      const addCommentElement = await testSubjects.find('add-comment');
      const addVisualizationButton = await addCommentElement.findByCssSelector(
        '[data-test-subj="euiMarkdownEditorToolbarButton"][aria-label="Visualization"]'
      );
      await addVisualizationButton.click();
      await testSubjects.existOrFail('savedObjectFinderItemList', { timeout: 10 * 1000 });

      // select visualization
      await testSubjects.setValue('savedObjectFinderSearchInput', visName, {
        clearWithKeyboard: true,
      });
      const sourceSubj = `savedObjectTitle${visName.replaceAll(' ', '-')}`;
      await testSubjects.click(sourceSubj);
      await header.waitUntilLoadingHasFinished();
      await lensPage.isLensPageOrFail();

      // save and return to cases app, add comment
      await lensPage.saveAndReturn();
      await testSubjects.existOrFail('cases-app', { timeout: 10 * 1000 });
      await this.submitComment();
    },

    async openVisualizationButtonTooltip() {
      const addCommentElement = await testSubjects.find('add-comment');
      const addVisualizationButton = await addCommentElement.findByCssSelector(
        '[data-test-subj="euiMarkdownEditorToolbarButton"][aria-label="Visualization"]'
      );
      await addVisualizationButton.moveMouseTo();
      await new Promise((resolve) => setTimeout(resolve, 500)); // give tooltip time to open
    },
  };
}
