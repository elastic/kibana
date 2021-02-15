/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'maps',
    'timeToVisualize',
    'visualize',
  ]);

  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  const LAYER_NAME = 'World Countries';
  let mapCounter = 0;

  async function createAndAddMapByValue() {
    log.debug(`createAndAddMapByValue`);
    const inViewMode = await PageObjects.dashboard.getIsInViewMode();
    if (inViewMode) {
      await PageObjects.dashboard.switchToEditMode();
    }
    await PageObjects.visualize.clickMapsApp();
    await PageObjects.maps.clickSaveAndReturnButton();
  }

  async function editByValueMap(saveToLibrary = false, saveToDashboard = true) {
    const inViewMode = await PageObjects.dashboard.getIsInViewMode();
    if (inViewMode) {
      await PageObjects.dashboard.switchToEditMode();
    }

    await dashboardPanelActions.clickEdit();
    await PageObjects.maps.clickAddLayer();
    await PageObjects.maps.selectEMSBoundariesSource();
    await PageObjects.maps.selectVectorLayer(LAYER_NAME);

    if (saveToLibrary) {
      await testSubjects.click('importFileButton');
      await testSubjects.click('mapSaveButton');
      await PageObjects.timeToVisualize.ensureSaveModalIsOpen;

      await PageObjects.timeToVisualize.saveFromModal(`my map ${mapCounter++}`, {
        redirectToOrigin: saveToDashboard,
      });

      if (!saveToDashboard) {
        await appsMenu.clickLink('Dashboard');
      }
    } else {
      await PageObjects.maps.clickSaveAndReturnButton();
    }

    await PageObjects.dashboard.waitForRenderComplete();
  }

  async function createNewDashboard() {
    await PageObjects.common.navigateToApp('dashboard');
    await PageObjects.dashboard.preserveCrossAppState();
    await PageObjects.dashboard.clickNewDashboard();
  }

  describe('dashboard maps by value', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('lens/basic');
    });

    describe('adding a map by value', () => {
      it('can add a map by value', async () => {
        await createNewDashboard();

        await dashboardVisualizations.ensureNewVisualizationDialogIsShowing();
        await createAndAddMapByValue();
        const newPanelCount = await PageObjects.dashboard.getPanelCount();
        expect(newPanelCount).to.eql(1);
      });
    });

    describe('editing a map by value', () => {
      before(async () => {
        await createNewDashboard();
        await dashboardVisualizations.ensureNewVisualizationDialogIsShowing();
        await createAndAddMapByValue();
        await editByValueMap();
      });

      it('retains the same number of panels', async () => {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.equal(1);
      });

      it('updates the panel on return', async () => {
        const hasLayer = await PageObjects.maps.doesLayerExist(LAYER_NAME);
        expect(hasLayer).to.be(true);
      });
    });

    describe('editing a map and adding to map library', () => {
      beforeEach(async () => {
        await createNewDashboard();
        await dashboardVisualizations.ensureNewVisualizationDialogIsShowing();
        await createAndAddMapByValue();
      });

      it('updates the existing panel when adding to dashboard', async () => {
        await editByValueMap(true);

        const hasLayer = await PageObjects.maps.doesLayerExist(LAYER_NAME);

        expect(hasLayer).to.be(true);
      });

      it('does not update the panel when only saving to library', async () => {
        await editByValueMap(true, false);
      });
    });
  });
}
