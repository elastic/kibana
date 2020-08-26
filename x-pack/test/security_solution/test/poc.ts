/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  describe('Cases', function () {
    it('Creates a new case with timeline and opens the timeline', async () => {
      await esArchiver.load('timeline');
      await PageObjects.common.navigateToApp('security/cases');
      await testSubjects.click('createNewCaseBtn');
      const title = await find.byCssSelector(
        '[data-test-subj="caseTitle"] [data-test-subj="input"]'
      );
      title.type('title');
      const tagsElement = await find.byCssSelector(
        '[data-test-subj="caseTags"] [data-test-subj="comboBoxSearchInput"]'
      );

      const tags = ['tag1', 'tag2'];
      tags.forEach((tag) => {
        tagsElement.type(`${tag}${browser.keys.RETURN}`);
      });

      const description = await find.byCssSelector(
        '[data-test-subj="caseDescription"] [data-test-subj="textAreaInput"]'
      );
      description.type('description');

      await testSubjects.click('insert-timeline-button');
      await testSubjects.setValue('timeline-super-select-search-box', 'SIEM');
      const timeline = await find.byCssSelector('.euiSelectableListItem');
      await timeline.click();
      await testSubjects.click('create-case-submit');

      expect(await testSubjects.exists('create-case-loading-spinner')).to.eql(true);

      await testSubjects.click('backToCases');

      expect(await testSubjects.exists('backToCases')).to.eql(false);

      expect(await testSubjects.getVisibleText('header-page-title')).to.eql('Cases BETA');
      expect(await testSubjects.getVisibleText('openStatsHeader')).to.eql('Open cases\n1');
      expect(await testSubjects.getVisibleText('closedStatsHeader')).to.eql('Closed cases\n0');
      expect(await testSubjects.getVisibleText('open-case-count')).to.eql('Open cases (1)');
      expect(await testSubjects.getVisibleText('closed-case-count')).to.eql('Closed cases (0)');
      expect(await testSubjects.getVisibleText('options-filter-popover-button-Reporter')).to.eql(
        'Reporter\n1'
      );
      expect(await testSubjects.getVisibleText('options-filter-popover-button-Tags')).to.eql(
        'Tags\n2'
      );
      expect(await testSubjects.getVisibleText('case-details-link')).to.eql('title');

      tags.forEach(async (tag, index) => {
        const tagElement = find.byCssSelector(
          `[data-test-subj="case-table-column-tags-${index}"] .euiBadge__text`
        );
        expect(await (await tagElement).getVisibleText()).to.eql(tag);
      });

      expect(await testSubjects.getVisibleText('case-table-column-commentCount')).to.eql('0');
      expect(await testSubjects.getVisibleText('case-table-column-createdAt')).to.contain('ago');
      expect(await testSubjects.getVisibleText('case-table-column-external-notPushed')).to.eql(
        'Not pushed'
      );
      expect(await testSubjects.exists('action-delete')).to.eql(true);
      expect(await testSubjects.exists('action-close')).to.eql(true);

      await testSubjects.click('case-details-link');

      expect(await testSubjects.getVisibleText('header-page-title')).to.eql('title');
      expect(await testSubjects.getVisibleText('case-view-status')).to.eql('open');

      const userActions = await find.allByCssSelector(
        '[data-test-subj="user-action-title"] .euiFlexItem'
      );
      expect(await userActions[1].getVisibleText()).to.eql('test_user');
      expect(await userActions[2].getVisibleText()).to.eql('added description');
      expect(await testSubjects.getVisibleText('markdown-root')).to.eql('descriptionSIEM test');

      const usernames = await testSubjects.findAll('case-view-username');
      expect(await usernames[0].getVisibleText()).to.eql('test_user');
      expect(await usernames[1].getVisibleText()).to.eql('test_user');

      expect(await testSubjects.getVisibleText('case-tags')).to.eql('tag1\ntag2');

      expect(await testSubjects.isEnabled('push-to-external-service')).to.eql(false);

      await testSubjects.click('markdown-timeline-link');

      expect(await testSubjects.exists('timeline-title')).to.eql(true);
      expect(await testSubjects.getAttribute('timeline-title', 'value')).to.eql('SIEM test');
      expect(await testSubjects.getAttribute('timeline-description', 'value')).to.eql(
        'description'
      );
      expect(await testSubjects.getVisibleText('timelineQueryInput')).to.eql('host.name:*');
    });
  });
}
