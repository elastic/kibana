/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup } from '@kbn/infra-forge';
import { loadTestData } from '../../../../api_integration/apis/slos/helper/load_test_data';
import { SloEsClient } from '../../../../api_integration/apis/slos/helper/es';
import { sloData } from '../../../../api_integration/apis/slos/fixtures/create_slo';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard']);
  const esClient = getService('es');
  const sloEsClient = new SloEsClient(esClient);
  const logger = getService('log');
  const slo = getService('slo');
  const sloUi = getService('sloUi');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('overview embeddable', function () {
    before(async () => {
      await loadTestData(getService);
      await slo.deleteAllSLOs();
      await slo.create(sloData);
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.switchToEditMode();
    });

    after(async () => {
      await slo.deleteAllSLOs();
      await cleanup({ esClient, logger });
      await sloEsClient.deleteTestSourceData();
    });

    describe('Single SLO', function () {
      it('should open SLO configuration flyout', async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickEmbeddableFactoryGroupButton('slos');
        await dashboardAddPanel.clickAddNewPanelFromUIActionLink('SLO Overview');
        await sloUi.common.assertSloOverviewConfigurationExists();
      });

      it('should have an overview mode selector', async () => {
        await sloUi.common.assertOverviewModeSelectorExists();
      });

      it('can select an SLO', async () => {
        await sloUi.common.assertOverviewSloSelectorExists();
        await sloUi.common.setComboBoxSloSelection();
        await sloUi.common.clickOverviewCofigurationSaveButton();
      });

      it('creates an overview panel', async () => {
        await sloUi.common.assertSingleOverviewPanelExists();
      });
    });

    describe('Group of SLOs', function () {
      it('can select Group Overview mode in the Flyout configuration', async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickEmbeddableFactoryGroupButton('slos');
        await dashboardAddPanel.clickAddNewPanelFromUIActionLink('SLO Overview');
        await sloUi.common.clickOverviewMode();
      });
    });
  });
}
