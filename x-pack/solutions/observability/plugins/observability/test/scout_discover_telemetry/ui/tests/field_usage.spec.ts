/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { getEbtEvents, setEbtOptIn } from '../fixtures/ebt';
import {
  addExistsFilter,
  addFieldToTable,
  clickFlyoutFieldAction,
  openSurroundingDocuments,
  removeFieldFromTable,
  toggleColumnInFlyout,
} from '../fixtures/discover_actions';
import { loadDiscoverTelemetryData, unloadDiscoverTelemetryData } from '../fixtures/setup';

const LOCAL_OBLT = ['@local-serverless-observability_complete'] as const;

test.describe('Discover observability telemetry field usage', { tag: [...LOCAL_OBLT] }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await loadDiscoverTelemetryData({ esArchiver, kbnClient });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  test.afterAll(async ({ kbnClient }) => {
    await unloadDiscoverTelemetryData({ kbnClient });
  });

  test('tracks a field added to the table', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;
    await discover.selectDataView('my-example-*');
    await discover.waitUntilSearchingHasFinished();
    await setEbtOptIn(page, true);
    await addFieldToTable(page, 'service.name');
    await discover.waitUntilSearchingHasFinished();

    const [event] = await getEbtEvents(page, ['discover_field_usage']);
    expect(event.properties).toStrictEqual({
      eventName: 'dataTableSelection',
      fieldName: 'service.name',
    });

    await addFieldToTable(page, '_score');
    await discover.waitUntilSearchingHasFinished();
    const events = await getEbtEvents(page, ['discover_field_usage']);
    expect(events[1].properties).toStrictEqual({
      eventName: 'dataTableSelection',
      fieldName: '<non-ecs>',
    });
  });

  test('tracks a field removed from the table', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;
    await discover.selectDataView('my-example-logs');
    await discover.waitUntilSearchingHasFinished();
    await addFieldToTable(page, 'log.level');
    await page.reload();
    await discover.waitUntilSearchingHasFinished();
    await setEbtOptIn(page, true);
    await removeFieldFromTable(page, 'log.level');
    await discover.waitUntilSearchingHasFinished();

    const [event] = await getEbtEvents(page, ['discover_field_usage']);
    expect(event.properties).toStrictEqual({
      eventName: 'dataTableRemoval',
      fieldName: 'log.level',
    });
  });

  test('tracks a filter added from the grid and the field list', async ({ page, pageObjects }) => {
    const { discover, dataGrid } = pageObjects;
    await discover.selectDataView('my-example-logs');
    await discover.waitUntilSearchingHasFinished();
    await setEbtOptIn(page, true);
    await dataGrid.filterCell({ rowIndex: 0, columnId: '@timestamp', mode: 'for' });
    await discover.waitUntilSearchingHasFinished();

    const [event] = await getEbtEvents(page, ['discover_field_usage']);
    expect(event.properties).toStrictEqual({
      eventName: 'filterAddition',
      fieldName: '@timestamp',
      filterOperation: '+',
    });

    await addExistsFilter(page, 'log.level');
    const events = await getEbtEvents(page, ['discover_field_usage']);
    expect(events[1].properties).toStrictEqual({
      eventName: 'filterAddition',
      fieldName: 'log.level',
      filterOperation: '_exists_',
    });
  });

  test('tracks field usage from the document viewer', async ({ page, pageObjects }) => {
    const { discover, dataGrid } = pageObjects;
    await discover.selectDataView('my-example-logs');
    await discover.waitUntilSearchingHasFinished();
    await addFieldToTable(page, 'log.level');
    await page.reload();
    await discover.waitUntilSearchingHasFinished();
    await setEbtOptIn(page, true);
    await dataGrid.openDocumentDetails({ rowIndex: 0 });
    await expect(discover.isShowingDocViewer()).resolves.toBe(true);

    const waitForSearch = () => discover.waitUntilSearchingHasFinished();
    await toggleColumnInFlyout(page, 'service.name', true, waitForSearch);
    await toggleColumnInFlyout(page, 'log.level', false, waitForSearch);
    await clickFlyoutFieldAction(page, 'log.level', 'addFilterOutValueButton');
    await waitForSearch();

    const [event1, event2, event3] = await getEbtEvents(page, ['discover_field_usage']);
    expect(event1.properties).toStrictEqual({
      eventName: 'dataTableSelection',
      fieldName: 'service.name',
    });
    expect(event2.properties).toStrictEqual({
      eventName: 'dataTableRemoval',
      fieldName: 'log.level',
    });
    expect(event3.properties).toStrictEqual({
      eventName: 'filterAddition',
      fieldName: 'log.level',
      filterOperation: '-',
    });
  });

  test('tracks field usage on the surrounding documents page', async ({ page, pageObjects }) => {
    const { discover, dataGrid } = pageObjects;
    await discover.selectDataView('my-example-logs');
    await discover.waitUntilSearchingHasFinished();
    await addFieldToTable(page, 'log.level');
    await page.reload();
    await discover.waitUntilSearchingHasFinished();
    await dataGrid.openDocumentDetails({ rowIndex: 1 });
    await expect(discover.isShowingDocViewer()).resolves.toBe(true);
    await openSurroundingDocuments(page);
    await discover.waitUntilSearchingHasFinished();
    await setEbtOptIn(page, true);
    await dataGrid.openDocumentDetails({ rowIndex: 0 });
    await expect(discover.isShowingDocViewer()).resolves.toBe(true);

    const waitForSearch = () => discover.waitUntilSearchingHasFinished();
    await toggleColumnInFlyout(page, 'service.name', true, waitForSearch);
    await toggleColumnInFlyout(page, 'log.level', false, waitForSearch);
    await clickFlyoutFieldAction(page, 'log.level', 'addFilterOutValueButton');
    await waitForSearch();

    const events = await getEbtEvents(page, ['discover_field_usage']);
    expect(events[0].properties).toStrictEqual({
      eventName: 'dataTableSelection',
      fieldName: 'service.name',
    });
    expect(events[1].properties).toStrictEqual({
      eventName: 'dataTableRemoval',
      fieldName: 'log.level',
    });
    expect(events[2].properties).toStrictEqual({
      eventName: 'filterAddition',
      fieldName: 'log.level',
      filterOperation: '-',
    });
    expect(events[2].context.discoverProfiles).toStrictEqual([
      'observability-root-profile',
      'observability-logs-data-source-profile',
    ]);
  });
});
