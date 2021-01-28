/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'visualize', 'maps']);

  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const dashboardVisualizations = getService('dashboardVisualizations');

  async function createAndAddMapByValue() {
    log.debug(`createAndAddMapByValue`);
    const inViewMode = await PageObjects.dashboard.getIsInViewMode();
    if (inViewMode) {
      await PageObjects.dashboard.switchToEditMode();
    }
    await PageObjects.visualize.clickMapsApp();
    await PageObjects.maps.clickSaveAndReturnButton();
  }

  describe('dashboard maps by value', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('lens/basic');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
    });

    it('can add a map by value', async () => {
      await dashboardVisualizations.ensureNewVisualizationDialogIsShowing();
      await createAndAddMapByValue();
      const newPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(newPanelCount).to.eql(1);
    });
  });
}
