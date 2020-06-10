/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ACTION_ID = 'ACTION_EXPLORE_DATA';
const TEST_SUBJ = `embeddablePanelAction-${ACTION_ID}`;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const drilldowns = getService('dashboardDrilldownsManage');
  const { dashboard, common } = getPageObjects(['dashboard', 'common']);
  const panelActions = getService('dashboardPanelActions');
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  describe('Explore underlying data - panel action', function () {
    before(async () => {
      await common.navigateToApp('dashboard');
      await dashboard.preserveCrossAppState();
    });

    it('action exists in panel context menu', async () => {
      await dashboard.loadSavedDashboard(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);
      await panelActions.openContextMenu();
      await testSubjects.existOrFail(TEST_SUBJ);
    });

    it('is a link <a> element', async () => {
      const dataAttributeSelector = `[data-test-subj=${TEST_SUBJ}]`;
      const aTag = 'a';
      const exists = await find.existsByCssSelector(`${aTag}${dataAttributeSelector}`);

      expect(aTag).to.be('a');
      expect(exists).to.be(true);
    });

    it('navigates to Discover app on click', async () => {
      await testSubjects.clickWhenNotDisabled(TEST_SUBJ);
      const el = await testSubjects.find('breadcrumbs');
      await el.findByCssSelector('[title=Discover]');
    });
  });
}
