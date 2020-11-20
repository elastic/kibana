/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

const ACTION_ID = 'ACTION_EXPORT_CSV';
const ACTION_TEST_SUBJ = `embeddablePanelAction-${ACTION_ID}`;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const drilldowns = getService('dashboardDrilldownsManage');
  const { dashboard } = getPageObjects(['dashboard']);
  const panelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');

  describe('Export to CSV action', () => {
    it('action exists in panel context menu', async () => {
      await dashboard.loadSavedDashboard(drilldowns.DASHBOARD_WITH_PIE_CHART_NAME);
      await panelActions.openContextMenu();
      await testSubjects.existOrFail(ACTION_TEST_SUBJ);
    });
  });
}
