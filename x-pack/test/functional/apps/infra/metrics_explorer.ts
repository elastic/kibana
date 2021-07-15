/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;
const DATE_WITHOUT_DATA = DATES.metricsAndLogs.hosts.withoutData;
const START_DATE = DATES.metricsAndLogs.hosts.min;
const END_DATE = DATES.metricsAndLogs.hosts.max;

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects([
    'common',
    'infraHome',
    'infraMetricsExplorer',
    'timePicker',
    'infraSavedViews',
  ]);

  describe('Metrics Explorer', function () {
    this.tags('includeFirefox');
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    describe('Basic Functionality', () => {
      before(async () => {
        esArchiver.load('infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.goToMetricExplorer();
        await pageObjects.timePicker.setAbsoluteRange(START_DATE, END_DATE);
      });
      after(() => esArchiver.unload('infra/metrics_and_logs'));

      it('should have three metrics by default', async () => {
        await pageObjects.infraMetricsExplorer.getMetrics();
      });
    });

    describe('Saved Views', () => {
      before(() => esArchiver.load('infra/metrics_and_logs'));
      after(() => esArchiver.unload('infra/metrics_and_logs'));
      describe('save functionality', () => {
        it('should have saved views component', async () => {
          await pageObjects.common.navigateToApp('infraOps');
          await pageObjects.infraHome.goToMetricExplorer();
          await pageObjects.infraSavedViews.getSavedViewsButton();
          await pageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
        });

        it('should open popover', async () => {
          await pageObjects.infraSavedViews.clickSavedViewsButton();
          await pageObjects.infraSavedViews.closeSavedViewsPopover();
        });

        it('should create new saved view and load it', async () => {
          await pageObjects.infraSavedViews.clickSavedViewsButton();
          await pageObjects.infraSavedViews.clickSaveNewViewButton();
          await pageObjects.infraSavedViews.getCreateSavedViewModal();
          await pageObjects.infraSavedViews.createNewSavedView('view1');
          await pageObjects.infraSavedViews.ensureViewIsLoaded('view1');
        });

        it('should new views should be listed in the load views list', async () => {
          await pageObjects.infraSavedViews.clickSavedViewsButton();
          await pageObjects.infraSavedViews.clickLoadViewButton();
          await pageObjects.infraSavedViews.ensureViewIsLoadable('view1');
          await pageObjects.infraSavedViews.closeSavedViewsLoadModal();
        });
      });
    });
  });
};
