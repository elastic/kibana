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

const getQueryParam = (page: ScoutPage, name: string) => new URL(page.url()).searchParams.get(name);

test.describe('Add data page', { tag: tags.stateful.classic }, () => {
  const { rangeFrom, rangeTo } = testData.PROFILING_OTEL_TEST_DATES;

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('switches between the OpenTelemetry and Universal Profiling instructions', async ({
    page,
    pageObjects: { flamegraphPage, profilingAddDataPage, profilingSchemaSelector },
  }) => {
    await test.step('open the add data page from the OpenTelemetry flamegraph', async () => {
      await flamegraphPage.gotoWithTimeRange(rangeFrom, rangeTo);
      await profilingSchemaSelector.waitForSelectedSchema();
      await profilingAddDataPage.openFromHeader();

      await expect(profilingAddDataPage.getSchemaTab('Profiling')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(profilingAddDataPage.otelInstructions).toBeVisible();
      expect(getQueryParam(page, 'schema')).toBe(ProfilingSchema.OTEL);
      expect(getQueryParam(page, 'selectedTab')).toBeNull();
    });

    await test.step('select the Universal Profiling instructions', async () => {
      await profilingAddDataPage.getSchemaTab('Universal Profiling (legacy)').click();

      await expect(profilingAddDataPage.getUniversalProfilingTab('kubernetes')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(profilingAddDataPage.otelInstructions).toBeHidden();
      expect(getQueryParam(page, 'schema')).toBe(ProfilingSchema.ECS);
      await expect.poll(() => getQueryParam(page, 'selectedTab')).toBe('kubernetes');
    });

    await test.step('go back to the OpenTelemetry instructions', async () => {
      await profilingAddDataPage.getSchemaTab('Profiling').click();

      await expect(profilingAddDataPage.otelInstructions).toBeVisible();
      expect(getQueryParam(page, 'schema')).toBe(ProfilingSchema.OTEL);
      expect(getQueryParam(page, 'selectedTab')).toBeNull();
    });
  });
});
