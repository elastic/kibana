/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { test, testData } from '../../fixtures';

const getSchemaQueryParam = (page: ScoutPage) => new URL(page.url()).searchParams.get('schema');
const getPathname = (page: ScoutPage) => new URL(page.url()).pathname;

test.describe('Profiling schema selector', { tag: tags.stateful.classic }, () => {
  // Universal Profiling (ECS) and OTel test data do not overlap in time
  const ecsDates = testData.PROFILING_TEST_DATES;
  const otelDates = testData.PROFILING_OTEL_TEST_DATES;

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('keeps the selected schema while moving across the profiling sections', async ({
    page,
    pageObjects: {
      flamegraphPage,
      functionsPage,
      profilingHomePage,
      profilingSettingsPage,
      profilingSchemaSelector,
      profilingSideNav,
    },
  }) => {
    await test.step('open the flamegraph with data in both schemas', async () => {
      await flamegraphPage.gotoWithTimeRange(ecsDates.rangeFrom, otelDates.rangeTo);
      await profilingSchemaSelector.waitForSelectedSchema();

      expect(await profilingSchemaSelector.getSelectedSchema()).toBe(ProfilingSchema.OTEL);
      await expect(await flamegraphPage.getFlamegraphChart()).toBeVisible();
    });

    await test.step('select Universal Profiling', async () => {
      await profilingSchemaSelector.selectSchema(ProfilingSchema.ECS);

      await expect.poll(() => getSchemaQueryParam(page)).toBe(ProfilingSchema.ECS);
      await expect(await flamegraphPage.getFlamegraphChart()).toBeVisible();
    });

    await test.step('open the functions from the side navigation', async () => {
      await profilingSideNav.gotoSection('functions');
      await expect.poll(() => getPathname(page)).toContain('/functions/topn');
      await profilingSchemaSelector.waitForSelectedSchema();

      expect(getSchemaQueryParam(page)).toBe(ProfilingSchema.ECS);
      expect(await profilingSchemaSelector.getSelectedSchema()).toBe(ProfilingSchema.ECS);
      await expect(await functionsPage.getTopNFunctionsRow(0)).toBeVisible();
    });

    await test.step('open the settings, which have no schema selector', async () => {
      await functionsPage.clickSettingsButton();

      await expect(await profilingSettingsPage.getPageTitle()).toContainText('Settings');
      expect(getSchemaQueryParam(page)).toBe(ProfilingSchema.ECS);
    });

    await test.step('open the stacktraces from the side navigation', async () => {
      await profilingSideNav.gotoSection('stacktraces');
      await expect.poll(() => getPathname(page)).toContain('/stacktraces');
      await profilingSchemaSelector.waitForSelectedSchema();

      expect(getSchemaQueryParam(page)).toBe(ProfilingSchema.ECS);
      expect(await profilingSchemaSelector.getSelectedSchema()).toBe(ProfilingSchema.ECS);
    });

    await test.step('group the Universal Profiling stacktraces by host', async () => {
      await profilingHomePage.clickTab('Hosts');
      await expect.poll(() => getPathname(page)).toContain('/stacktraces/hosts');

      await expect(await profilingHomePage.getStackTracesCharts()).not.toHaveCount(0);
      await expect(
        await profilingHomePage.getStackTracesChart(testData.PROFILING_OTEL_TEST_HOST_ID)
      ).toBeHidden();
    });

    await test.step('select OpenTelemetry', async () => {
      await profilingSchemaSelector.selectSchema(ProfilingSchema.OTEL);

      await expect.poll(() => getSchemaQueryParam(page)).toBe(ProfilingSchema.OTEL);
      await expect(
        await profilingHomePage.getStackTracesChart(testData.PROFILING_OTEL_TEST_HOST_ID)
      ).toBeVisible();
    });
  });

  test('recovers from a selected schema without data by selecting another schema', async ({
    pageObjects: { functionsPage, profilingSchemaSelector },
  }) => {
    await test.step('open the functions with a schema without data', async () => {
      await functionsPage.gotoWithTimeRange(otelDates.rangeFrom, otelDates.rangeTo, {
        schema: ProfilingSchema.ECS,
      });
      await profilingSchemaSelector.waitForSelectedSchema();

      await expect(profilingSchemaSelector.invalidSchemaToken).toBeVisible();
      await expect(await functionsPage.getNoDataPrompt()).toBeVisible();
    });

    await test.step('select OpenTelemetry', async () => {
      await profilingSchemaSelector.selectSchema(ProfilingSchema.OTEL);

      await expect(profilingSchemaSelector.invalidSchemaToken).toBeHidden();
      await expect(await functionsPage.getNoDataPrompt()).toBeHidden();
      await expect(await functionsPage.getTopNFunctionsRow(0)).toBeVisible();
    });
  });
});
