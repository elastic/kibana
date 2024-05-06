/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateSLOInput } from '@kbn/slo-schema';
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
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');

  describe('overview embeddable', function () {
    let createSLOInput: CreateSLOInput;
    before(async () => {
      await loadTestData(getService);
      await slo.deleteAllSLOs();
    });

    beforeEach(async () => {
      createSLOInput = sloData;
      await slo.create(createSLOInput);
    });

    afterEach(async () => {
      await slo.deleteAllSLOs();
    });

    after(async () => {
      await cleanup({ esClient, logger });
      await sloEsClient.deleteTestSourceData();
    });

    it('should open SLO configuration flyout', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.switchToEditMode();
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickEmbeddableFactoryGroupButton('slos');
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('SLO Overview');
      await testSubjects.existOrFail('sloOverviewConfiguration', { timeout: 2000 });
    });

    it('should be able to select an SLO', async () => {
      await testSubjects.existOrFail('singleSloSelector', { timeout: 2000 });
      await testSubjects.click('sloSelector');
      await comboBox.set('sloSelector > comboBoxInput', 'Test SLO for api integration');
      await testSubjects.clickWhenNotDisabledWithoutRetry('sloConfirmButton');
    });
  });
}
