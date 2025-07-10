/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { before, expect, journey, step, after } from '@elastic/synthetics';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';
import { SyntheticsServices } from './services/synthetics_services';

journey('OverviewSaveLensVisualization', async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });
  const syntheticsService = new SyntheticsServices(params);

  before(async () => {
    await syntheticsService.cleanUp();
  });

  after(async () => {
    await syntheticsService.cleanUp();
  });

  step('Go to Monitors overview page', async () => {
    await syntheticsApp.navigateToOverview(true, 15);
  });

  step('Create test monitor', async () => {
    await syntheticsService.addTestMonitor('Test Overview Save Lens Visualization Monitor', {
      type: 'http',
      urls: 'https://www.google.com',
      locations: ['us_central'],
    });
    await page.getByTestId('syntheticsRefreshButtonButton').click();
  });

  step('Open the save lens visualization', async () => {
    await page
      .getByTestId('overviewErrorsSparklines')
      .getByTestId('embeddablePanelHoverActions-')
      .hover();

    await page
      .getByTestId('overviewErrorsSparklines')
      .getByTestId('embeddablePanelToggleMenuIcon')
      .click();
    await page.getByTestId('embeddablePanelAction-expViewSave').click();
  });

  step('The attributes are correctly passed to the save lens visualization modal', async () => {
    expect(await page.getByTestId('savedObjectTitle').inputValue()).toBe(
      'Prefilled from exploratory view app'
    );
  });
});
