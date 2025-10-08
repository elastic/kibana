/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  describe('infra rules', () => {
    const { common } = getPageObjects(['common']);
    const find = getService('find');

    it('navigates to infra app', async () => {
      await common.navigateToApp('infraOps');
    });

    it('opens the infra alerts popover', async () => {
      await find.clickByButtonText('Alerts');
      await find.clickByButtonText('Infrastructure');
      await find.clickByButtonText('Create inventory rule');
    });

    it('opens the Details tab', () => find.clickByButtonText('Details'));

    it('contains the "Related dashboards" section', async () => {
      const linkedDashboardsElement = await find.byCssSelector(
        '[data-test-subj="ruleLinkedDashboards"]'
      );
      expect(linkedDashboardsElement).to.be.ok();
      expect(await linkedDashboardsElement.isDisplayed()).to.be(true);
    });
  });
}
