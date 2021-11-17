/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';
import { UserAtSpaceScenarios } from './scenarios';

function getUrlPrefix(spaceId: string) {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  describe('alerting upgrade tests', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('rules');
    });

    it('should show the rule as expected', async () => {
      await retry.try(async () => {
        const names = await testSubjects.getVisibleTextAll('alertsTableCell-name');
        const statuses = await testSubjects.getVisibleTextAll('alertsTableCell-status');

        expect(names.length).to.be(1);
        expect(names[0]).to.be('Upgrade');

        expect(statuses.length).to.be(1);
        expect(statuses[0]).to.be('Active');
      });
    });

    it('should show the rule detail page as expected', async () => {
      await find.clickByCssSelector('[data-test-subj="alertsTableCell-name"] button');

      // Wait until the rule detail page loads
      expect(
        await (async () => {
          const pageTitle = await retry.try(() => testSubjects.find('alertDetailsTitle'));
          return pageTitle !== null;
        })()
      ).to.be(true);

      const status = await testSubjects.getVisibleTextAll('alertInstancesTableCell-status');
      expect(status.length).to.be(1);
      expect(status[0]).to.be('Active (Query matched)');
    });
  });
}
