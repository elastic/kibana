/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ObservabilityTelemetryFtrProviderContext } from '../../../config.telemetry';

export default function ({ getService, getPageObjects }: ObservabilityTelemetryFtrProviderContext) {
  const { common, discover, unifiedFieldList, dashboard, header, timePicker, svlCommonPage } =
    getPageObjects([
      'common',
      'discover',
      'unifiedFieldList',
      'dashboard',
      'header',
      'timePicker',
      'svlCommonPage',
    ]);
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const dataViews = getService('dataViews');
  const monacoEditor = getService('monacoEditor');
  const ebtUIHelper = getService('kibana_ebt_ui');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const browser = getService('browser');

  describe('telemetry', () => {
    describe('context', () => {
      before(async () => {
        await svlCommonPage.loginAsAdmin();
        await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
        await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      });

      after(async () => {
        await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      });

      it('should set EBT context for telemetry events with o11y root profile', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await discover.waitUntilSearchingHasFinished();
        await monacoEditor.setCodeEditorValue('from my-example-* | sort @timestamp desc');
        await ebtUIHelper.setOptIn(true);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['performance_metric'],
          withTimeoutMs: 500,
        });

        expect(events[events.length - 1].context.discoverProfiles).to.eql([
          'observability-root-profile',
          'default-data-source-profile',
        ]);
      });

      it('should set EBT context for telemetry events when logs data source profile and reset', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await discover.waitUntilSearchingHasFinished();
        await monacoEditor.setCodeEditorValue('from my-example-logs | sort @timestamp desc');
        await ebtUIHelper.setOptIn(true);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['performance_metric'],
          withTimeoutMs: 500,
        });

        expect(events[events.length - 1].context.discoverProfiles).to.eql([
          'observability-root-profile',
          'observability-logs-data-source-profile',
        ]);

        // should reset the profiles when navigating away from Discover
        await common.navigateToApp('home');
        await retry.waitFor('home page to open', async () => {
          return await testSubjects.exists('homeApp');
        });
        await testSubjects.click('addSampleData');

        await retry.try(async () => {
          const eventsAfter = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
            eventTypes: ['click'],
            withTimeoutMs: 500,
          });

          expect(eventsAfter[eventsAfter.length - 1].context.discoverProfiles).to.eql([]);
        });
      });

      it('should not set EBT context for embeddables', async () => {
        await dashboard.navigateToApp();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await timePicker.setDefaultAbsoluteRange();
        await ebtUIHelper.setOptIn(true);
        await dashboardAddPanel.addSavedSearch('A Saved Search');
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();
        const rows = await dataGrid.getDocTableRows();
        expect(rows.length).to.be.above(0);
        await testSubjects.click('dashboardEditorMenuButton');

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['click'],
          withTimeoutMs: 500,
        });

        expect(
          events.length > 0 &&
            events.every((event) => !(event.context.discoverProfiles as string[])?.length)
        ).to.be(true);
      });
    });

    describe('events', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
      });

      it('should track field usage when a field is added to the table', async () => {
        await dataViews.switchToAndValidate('my-example-*');
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await ebtUIHelper.setOptIn(true);
        await unifiedFieldList.clickFieldListItemAdd('service.name');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'dataTableSelection',
          fieldName: 'service.name',
        });

        await unifiedFieldList.clickFieldListItemAdd('_score');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const [_, event2] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event2.properties).to.eql({
          eventName: 'dataTableSelection',
        });
      });

      it('should track field usage when a field is removed from the table', async () => {
        await dataViews.switchToAndValidate('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('log.level');
        await browser.refresh();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await ebtUIHelper.setOptIn(true);
        await unifiedFieldList.clickFieldListItemRemove('log.level');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'dataTableRemoval',
          fieldName: 'log.level',
        });
      });

      it('should track field usage when a filter is added', async () => {
        await dataViews.switchToAndValidate('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await ebtUIHelper.setOptIn(true);
        await dataGrid.clickCellFilterForButtonExcludingControlColumns(0, 0);
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'filterAddition',
          fieldName: '@timestamp',
          filterOperation: '+',
        });

        await unifiedFieldList.clickFieldListExistsFilter('log.level');

        const [_, event2] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event2.properties).to.eql({
          eventName: 'filterAddition',
          fieldName: 'log.level',
          filterOperation: '_exists_',
        });
      });

      it('should track field usage for doc viewer too', async () => {
        await dataViews.switchToAndValidate('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('log.level');
        await browser.refresh();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await ebtUIHelper.setOptIn(true);

        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        // event 1
        await dataGrid.clickFieldActionInFlyout('service.name', 'toggleColumnButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        // event 2
        await dataGrid.clickFieldActionInFlyout('log.level', 'toggleColumnButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        // event 3
        await dataGrid.clickFieldActionInFlyout('log.level', 'addFilterOutValueButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        const [event1, event2, event3] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event1.properties).to.eql({
          eventName: 'dataTableSelection',
          fieldName: 'service.name',
        });

        expect(event2.properties).to.eql({
          eventName: 'dataTableRemoval',
          fieldName: 'log.level',
        });

        expect(event3.properties).to.eql({
          eventName: 'filterAddition',
          fieldName: 'log.level',
          filterOperation: '-',
        });
      });

      it('should track field usage on surrounding documents page', async () => {
        await dataViews.switchToAndValidate('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('log.level');
        await browser.refresh();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await dataGrid.clickRowToggle({ rowIndex: 1 });
        await discover.isShowingDocViewer();

        const [, surroundingActionEl] = await dataGrid.getRowActions();
        await surroundingActionEl.click();
        await header.waitUntilLoadingHasFinished();
        await ebtUIHelper.setOptIn(true);

        await dataGrid.clickRowToggle({ rowIndex: 0 });
        await discover.isShowingDocViewer();

        // event 1
        await dataGrid.clickFieldActionInFlyout('service.name', 'toggleColumnButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        // event 2
        await dataGrid.clickFieldActionInFlyout('log.level', 'toggleColumnButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        // event 3
        await dataGrid.clickFieldActionInFlyout('log.level', 'addFilterOutValueButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        const [event1, event2, event3] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event1.properties).to.eql({
          eventName: 'dataTableSelection',
          fieldName: 'service.name',
        });

        expect(event2.properties).to.eql({
          eventName: 'dataTableRemoval',
          fieldName: 'log.level',
        });

        expect(event3.properties).to.eql({
          eventName: 'filterAddition',
          fieldName: 'log.level',
          filterOperation: '-',
        });

        expect(event3.context.discoverProfiles).to.eql([
          'observability-root-profile',
          'observability-logs-data-source-profile',
        ]);
      });
    });
  });
}
