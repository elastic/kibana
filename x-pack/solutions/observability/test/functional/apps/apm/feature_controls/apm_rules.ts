/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { type FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'error', 'security']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  describe('rules', () => {
    before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/metrics_and_apm'));
    after(() =>
      esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/metrics_and_apm')
    );

    it('navigates to APM app', async () => {
      await PageObjects.common.navigateToApp('apm');

      await testSubjects.existOrFail('apmMainContainer', {
        timeout: 10000,
      });
    });

    it('opens the APM alerts popover', async () => {
      await find.clickByButtonText('Alerts');
      await find.clickByButtonText('Create threshold rule');
      await find.clickByButtonText('Latency');
    });

    it('navigates to the Details tab', () => find.clickByButtonText('Details'));

    it('contains the "Related dashboards" section', async () => {
      const linkedDashboardsElement = await find.byCssSelector(
        '[data-test-subj="ruleLinkedDashboards"]'
      );
      expect(linkedDashboardsElement).to.be.ok();
      expect(await linkedDashboardsElement.isDisplayed()).to.be(true);
    });
  });
}
