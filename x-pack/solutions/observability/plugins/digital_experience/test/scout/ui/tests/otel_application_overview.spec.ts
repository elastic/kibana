/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AxeBuilder from '@axe-core/playwright';
import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

/** The `filters` param of the URL: Kibana filters as rison, `negate:!t` for an excluded value. */
const filtersParam = (page: ScoutPage) => new URL(page.url()).searchParams.get('filters') ?? '';

/** The rison of one filter on `key` with these `params`, included (or excluded when `negate`). */
const filtersWith = (key: string, params: string, negate = false) =>
  new RegExp(`key:${key},negate:!${negate ? 't' : 'f'},params:${params}`);

const WIDE_VIEWPORT = { width: 1800, height: 900 };
// Narrower than the room the whole row of filters takes, but wide enough for the query bar, the
// date picker and a button or two.
const NARROW_VIEWPORT = { width: 1400, height: 760 };

// EDOT Browser applications need no ux plugin, so these run on serverless too.
test.describe(
  'Digital Experience EDOT Browser application',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsViewer();
      // Wide enough for the whole row of filters, which gives way to "All filters" when narrower.
      await page.setViewportSize(WIDE_VIEWPORT);
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    test('shows the pages, browsers and clicks of the EDOT Browser application', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });

      await expect(digitalExperience.otelOverviewTopPages).toContainText('/products');
      await expect(digitalExperience.otelOverviewTopPages).toContainText('1.20 s');
      await expect(digitalExperience.otelOverviewBreakdowns).toContainText('Safari');
      await expect(digitalExperience.otelOverviewBreakdowns).toContainText('iPhone');
      await expect(digitalExperience.otelOverviewTopClicks).toContainText('#add-to-cart');
    });

    test('shows the top errors on the Overview, linked to the Errors tab', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });

      await expect(digitalExperience.errorsPanel).toContainText('x is undefined');
      await digitalExperience.errorsViewAll.click();

      await expect(page).toHaveURL(/\/otel-shop\/errors/);
      await expect(digitalExperience.errorsPanel).toContainText('x is undefined');
    });

    test('shows the error groups on the Errors tab, with the stack trace in a flyout', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await digitalExperience.errorsTab.click();

      await expect(digitalExperience.errorsPanel).toContainText('x is undefined');
      await digitalExperience.errorsPanel.getByRole('button', { name: 'TypeError' }).click();
      await expect(digitalExperience.errorFlyout).toContainText('at checkout (app.js:10:5)');
    });

    test('shows the requests and the render-blocking resources on the Network tab', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await digitalExperience.networkTab.click();

      await expect(digitalExperience.networkHttpRequests).toContainText(
        'https://otel-shop.example.com/api/checkout'
      );
      await expect(digitalExperience.networkHttpRequests).toContainText('100% (1)');
      await expect(digitalExperience.networkSlowestResources).toContainText('app.js');
      await expect(digitalExperience.networkSlowestResources).toContainText('Render-blocking');
    });

    test('keeps the EDOT Browser Overview headings in order', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(
        digitalExperience.otelOverviewVitals.getByRole('heading', {
          level: 2,
          name: 'Core web vitals',
        })
      ).toBeVisible();

      // `page.checkA11y` only reports serious and critical violations, and heading-order is moderate.
      const { violations } = await new AxeBuilder({ page })
        .include('main')
        .withRules(['heading-order'])
        .analyze();
      expect(violations).toStrictEqual([]);
    });

    test('narrows the EDOT Browser Overview by its filters, and keeps them across the tabs', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(digitalExperience.otelOverviewPageLoads).toContainText(
        testData.OTEL_SHOP_PAGE_LOADS
      );

      await test.step('lists each browser with its page loads', async () => {
        await digitalExperience.overviewFilter('browser').click();

        const list = digitalExperience.overviewFilterList('browser');
        await expect(list).toContainText(
          new RegExp(`Chrome\\s*${testData.OTEL_SHOP_CHROME_PAGE_LOADS}`)
        );
        await expect(list).toContainText(
          new RegExp(`Safari\\s*${testData.OTEL_SHOP_SAFARI_PAGE_LOADS}`)
        );
        await page.keyboard.press('Escape');
      });

      await test.step('narrows the page loads to a browser', async () => {
        await digitalExperience.selectOverviewFilter('browser', 'Safari');

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_SAFARI_PAGE_LOADS
        );
        await expect
          .poll(() => filtersParam(page))
          .toMatch(filtersWith('browser', '\\(query:Safari\\)'));
      });

      await test.step('narrows the pages, breakdowns and top errors too', async () => {
        await expect(digitalExperience.otelOverviewBreakdowns).toContainText('Safari');
        await expect(digitalExperience.otelOverviewBreakdowns).not.toContainText('Chrome');
        await expect(digitalExperience.otelOverviewTopPages).not.toContainText('/products');
        // Its empty state shows once the errors have loaded; a panel still loading has no error
        // text either, so only this proves the error is gone.
        await expect(digitalExperience.errorsPanelEmpty).toBeVisible();
        await expect(digitalExperience.errorsPanel).not.toContainText('x is undefined');
      });

      await test.step('lists the values of the other filters among that browser only', async () => {
        await digitalExperience.overviewFilter('os').click();

        await expect(digitalExperience.overviewFilterList('os')).toContainText(/iOS\s*1/);
        await expect(digitalExperience.overviewFilterOption('os', 'macOS')).toBeHidden();
        await page.keyboard.press('Escape');
      });

      await test.step('lists the other browsers still, as a filter ignores its own selection', async () => {
        await digitalExperience.overviewFilter('browser').click();

        await expect(digitalExperience.overviewFilterList('browser')).toContainText(
          new RegExp(`Chrome\\s*${testData.OTEL_SHOP_CHROME_PAGE_LOADS}`)
        );
        await page.keyboard.press('Escape');
      });

      await test.step('survives a reload', async () => {
        await page.reload();

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_SAFARI_PAGE_LOADS
        );
        await expect(digitalExperience.overviewPill('browser', 'Safari')).toContainText(
          'Browser: Safari'
        );
      });

      await test.step('keeps the filters on the Errors tab, which they narrow too', async () => {
        await digitalExperience.errorsViewAll.click();

        await expect(page).toHaveURL(/\/otel-shop\/errors/);
        await expect
          .poll(() => filtersParam(page))
          .toMatch(filtersWith('browser', '\\(query:Safari\\)'));
        // Wait for the loaded empty state: the panel shows no error text while it loads either.
        await expect(digitalExperience.errorsPanelEmpty).toBeVisible();
        await expect(digitalExperience.errorsPanel).not.toContainText('x is undefined');

        await digitalExperience.overviewTab.click();
        await expect
          .poll(() => filtersParam(page))
          .toMatch(filtersWith('browser', '\\(query:Safari\\)'));
      });

      await test.step('carries over to the Sessions tab and back', async () => {
        await digitalExperience.sessionsTab.click();
        await expect(page).toHaveURL(/\/sessions/);
        await expect(page).toHaveURL(/browser=Safari/);

        await digitalExperience.overviewTab.click();
        await expect
          .poll(() => filtersParam(page))
          .toMatch(filtersWith('browser', '\\(query:Safari\\)'));
        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_SAFARI_PAGE_LOADS
        );
      });

      await test.step('shows every page load again once the filters are cleared', async () => {
        await digitalExperience.overviewClearFilters.click();

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_PAGE_LOADS
        );
        await expect.poll(() => filtersParam(page)).toBe('');
      });
    });

    test('excludes a value and picks several at once, in the row and in the All filters flyout', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(digitalExperience.otelOverviewPageLoads).toContainText(
        testData.OTEL_SHOP_PAGE_LOADS
      );
      // Without the Safari one: Chrome's and the page load that has no browser.
      const withoutSafari = String(
        Number(testData.OTEL_SHOP_PAGE_LOADS) - Number(testData.OTEL_SHOP_SAFARI_PAGE_LOADS)
      );

      await test.step('leaves out the page loads of an excluded browser', async () => {
        await digitalExperience.excludeOverviewFilter('browser', 'Safari');

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(withoutSafari);
        await expect(digitalExperience.overviewPill('browser', 'Safari')).toContainText(
          'Browser: not Safari'
        );
        await expect
          .poll(() => filtersParam(page))
          .toMatch(filtersWith('browser', '\\(query:Safari\\)', true));
      });

      await test.step('lists the excluded value still, so it can be included again', async () => {
        await digitalExperience.overviewFilter('browser').click();

        await expect(digitalExperience.overviewFilterOption('browser', 'Safari')).toBeVisible();
        await expect(digitalExperience.overviewFilterExclude('browser', 'Safari')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        await page.keyboard.press('Escape');
      });

      await test.step('does not carry an exclusion over to the Sessions tab, which has no exclusions', async () => {
        await digitalExperience.sessionsTab.click();

        await expect(page).toHaveURL(/\/sessions/);
        await expect(page).not.toHaveURL(/browser=/);

        await digitalExperience.overviewTab.click();
        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_PAGE_LOADS
        );
        await expect.poll(() => filtersParam(page)).toBe('');
        await digitalExperience.excludeOverviewFilter('browser', 'Safari');
        await expect(digitalExperience.otelOverviewPageLoads).toContainText(withoutSafari);
      });

      await test.step('applies the picks of all the filters together from the flyout', async () => {
        await digitalExperience.overviewAllFilters.click();
        await expect(digitalExperience.overviewFiltersApply).toBeDisabled();

        // The excluded Safari becomes included, next to Chrome and macOS.
        await digitalExperience.overviewFlyoutOption('browser', 'Safari').click();
        await digitalExperience.overviewFlyoutOption('browser', 'Chrome').click();
        await digitalExperience.overviewFlyoutOption('os', 'macOS').click();
        await expect
          .poll(() => filtersParam(page))
          .toMatch(filtersWith('browser', '\\(query:Safari\\)', true));
        await digitalExperience.overviewFiltersApply.click();

        await expect(digitalExperience.overviewFiltersFlyout).toBeHidden();
        // Chrome or Safari, on macOS: the three Chrome page loads.
        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_CHROME_PAGE_LOADS
        );
        await expect(digitalExperience.overviewPill('browser', 'Safari')).toContainText(
          'Browser: Safari'
        );
        await expect(digitalExperience.overviewPill('browser', 'Chrome')).toContainText(
          'Browser: Chrome'
        );
        await expect(digitalExperience.overviewPill('os', 'macOS')).toContainText('OS: macOS');
        await expect
          .poll(() => filtersParam(page))
          .toMatch(filtersWith('browser', '!\\(Safari,Chrome\\)'));
        await expect.poll(() => filtersParam(page)).toMatch(filtersWith('os', '\\(query:macOS\\)'));
      });

      await test.step('removes a value with its pill', async () => {
        await digitalExperience.overviewPill('os', 'macOS').getByRole('button').click();

        await expect(digitalExperience.overviewPill('os', 'macOS')).toBeHidden();
        await expect.poll(() => filtersParam(page)).not.toContain('key:os');
        await expect(digitalExperience.overviewPill('browser', 'Chrome')).toBeVisible();
      });

      await test.step('removes every filter with Clear all', async () => {
        await digitalExperience.overviewAllFilters.click();
        await digitalExperience.overviewFiltersReset.click();
        await digitalExperience.overviewFiltersApply.click();

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_PAGE_LOADS
        );
        await expect.poll(() => filtersParam(page)).toBe('');
      });
    });

    test('filters by a row of the breakdowns or the top pages, and takes the filter off when it is clicked again', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(digitalExperience.otelOverviewPageLoads).toContainText(
        testData.OTEL_SHOP_PAGE_LOADS
      );

      await test.step('narrows the Overview to the browser that was clicked', async () => {
        await digitalExperience.overviewBreakdownFilter('browser', 'Safari').click();

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_SAFARI_PAGE_LOADS
        );
        await expect(digitalExperience.overviewPill('browser', 'Safari')).toContainText(
          'Browser: Safari'
        );
        await expect(
          digitalExperience.overviewBreakdownFilter('browser', 'Safari')
        ).toHaveAttribute('aria-pressed', 'true');
      });

      await test.step('takes the filter off when the row is clicked again', async () => {
        await digitalExperience.overviewBreakdownFilter('browser', 'Safari').click();

        await expect(digitalExperience.overviewPill('browser', 'Safari')).toBeHidden();
        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_PAGE_LOADS
        );
      });

      await test.step('narrows the page loads to a page of the top pages', async () => {
        await digitalExperience.overviewTopPageFilter('/products').click();

        await expect(
          digitalExperience.overviewPill('pageUrl', 'https://otel-shop.example.com/products')
        ).toBeVisible();
        await expect(digitalExperience.otelOverviewPageLoads).toContainText('2');
      });
    });

    test('narrows the Overview by the version of the application', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(digitalExperience.otelOverviewPageLoads).toContainText(
        testData.OTEL_SHOP_PAGE_LOADS
      );

      await digitalExperience.overviewAllFilters.click();
      // Two of the page loads have version 1.2.0, the other three 1.3.0.
      await expect(digitalExperience.overviewFlyoutOption('appVersion', '1.3.0')).toBeVisible();
      await digitalExperience.overviewFlyoutOption('appVersion', '1.2.0').click();
      await digitalExperience.overviewFiltersApply.click();

      await expect(digitalExperience.otelOverviewPageLoads).toContainText('2');
      await expect(digitalExperience.overviewPill('appVersion', '1.2.0')).toContainText(
        'App version: 1.2.0'
      );
    });

    test('narrows the page loads by text the URL contains, and by text it does not', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(digitalExperience.otelOverviewPageLoads).toContainText(
        testData.OTEL_SHOP_PAGE_LOADS
      );

      await test.step('keeps the page loads whose URL contains the text, whatever its case', async () => {
        await digitalExperience.overviewAllFilters.click();
        await digitalExperience.addOverviewFlyoutText('PRODUCTS');
        await digitalExperience.overviewFiltersApply.click();

        // Two of the page loads are of /products.
        await expect(digitalExperience.otelOverviewPageLoads).toContainText('2');
        await expect(digitalExperience.overviewPill('pageContains', 'PRODUCTS')).toContainText(
          'URL contains: PRODUCTS'
        );
      });

      await test.step('leaves out the page loads whose URL contains the text when it is excluded', async () => {
        await digitalExperience.overviewAllFilters.click();
        await digitalExperience.overviewFlyoutExclude('pageContains', 'PRODUCTS').click();
        await digitalExperience.overviewFiltersApply.click();

        await expect(digitalExperience.otelOverviewPageLoads).toContainText('3');
        await expect(digitalExperience.overviewPill('pageContains', 'PRODUCTS')).toContainText(
          'URL contains: not PRODUCTS'
        );
      });
    });

    test('shows the load time at the percentile picked, and keeps it in the URL', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(digitalExperience.overviewLoadTime).toContainText('Load time (p75)');
      await expect(digitalExperience.overviewPercentile).toHaveValue('75');

      await digitalExperience.overviewPercentile.selectOption('95');

      await expect(digitalExperience.overviewLoadTime).toContainText('Load time (p95)');
      await expect(page).toHaveURL(/percentile=95/);

      await page.reload();

      await expect(digitalExperience.overviewLoadTime).toContainText('Load time (p95)');
      await expect(digitalExperience.overviewPercentile).toHaveValue('95');

      await digitalExperience.overviewPercentile.selectOption('75');
      await expect(page).not.toHaveURL(/percentile=/);
    });

    test('narrows the Overview with a KQL query, and shows a query that does not parse', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(digitalExperience.otelOverviewPageLoads).toContainText(
        testData.OTEL_SHOP_PAGE_LOADS
      );

      await test.step('keeps the page loads the query matches', async () => {
        await digitalExperience.submitOverviewKuery('browser.name : "Chrome"');

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_CHROME_PAGE_LOADS
        );
        await expect(page).toHaveURL(/kuery=/);
      });

      await test.step('survives a reload', async () => {
        await page.reload();

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_CHROME_PAGE_LOADS
        );
        await expect(digitalExperience.overviewKuery).toHaveValue('browser.name : "Chrome"');
      });

      await test.step('works together with a filter', async () => {
        await digitalExperience.excludeOverviewFilter('os', 'macOS');

        await expect(digitalExperience.otelOverviewPageLoads).toContainText('0');
      });

      await test.step('says where a query does not parse, and keeps the Overview as it was', async () => {
        // No bracket: the bar closes one as it is typed, which would make the query valid.
        await digitalExperience.submitOverviewKuery('browser.name :');

        await expect(digitalExperience.overviewKueryError).toBeVisible();
        await expect(page).toHaveURL(/kuery=browser\.name/);
      });

      await test.step('refuses a field named by a pattern, which no field has the name of', async () => {
        await digitalExperience.submitOverviewKuery('browser.*: "Chrome"');

        await expect(digitalExperience.overviewKueryError).toContainText(
          'browser.* has a wildcard'
        );
        await expect(page).toHaveURL(/kuery=browser\.name/);
      });

      await test.step('shows every page load again once the query and the filter are removed', async () => {
        await digitalExperience.submitOverviewKuery('');
        // Each URL update starts from the URL as it is, so the next one waits for this one.
        await expect(page).not.toHaveURL(/kuery=/);
        await digitalExperience.overviewClearFilters.click();

        await expect(digitalExperience.otelOverviewPageLoads).toContainText(
          testData.OTEL_SHOP_PAGE_LOADS
        );
        await expect(page).not.toHaveURL(/kuery=/);
      });
    });

    test('keeps the query, the filters and the date picker on one row, with fewer filter buttons when narrow', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
        // A link written by hand: one phrase filter, as Kibana filters in rison.
        filters:
          "!((meta:(key:pageUrl,negate:!f,params:(query:'https://otel-shop.example.com/'),type:phrase)))",
      });
      // The page narrows the page loads, so only the end of the loading is waited for.
      await expect(digitalExperience.otelOverviewPageLoads).not.toContainText('--');

      const rowOf = async (locator: Locator): Promise<number> =>
        Math.round((await locator.boundingBox())?.y ?? -1);

      await test.step('shows every filter button when there is room', async () => {
        await expect(digitalExperience.overviewFilter('browser')).toBeVisible();
        await expect(digitalExperience.overviewFilter('pageUrl')).toBeVisible();
        expect(await rowOf(digitalExperience.overviewDatePicker)).toBeLessThan(
          (await rowOf(digitalExperience.overviewKuery)) + 20
        );
      });

      await test.step('gives way to All filters when narrow, and the date picker stays on the row', async () => {
        await page.setViewportSize(NARROW_VIEWPORT);

        await expect(digitalExperience.overviewFilter('browser')).toBeHidden();
        await expect
          .poll(async () => {
            const picker = await rowOf(digitalExperience.overviewDatePicker);
            const query = await rowOf(digitalExperience.overviewKuery);
            return Math.abs(picker - query) < 20;
          })
          .toBe(true);

        // The query bar stays inside the page, instead of spilling over the navigation.
        const query = await digitalExperience.overviewKuery.boundingBox();
        const kpis = await digitalExperience.otelOverviewKpis.boundingBox();
        expect(query?.x ?? -1).toBeGreaterThanOrEqual((kpis?.x ?? 0) - 1);
      });

      await test.step('keeps what a hidden filter selects as a pill, and in the flyout', async () => {
        await expect(
          digitalExperience.overviewPill('pageUrl', 'https://otel-shop.example.com/')
        ).toBeVisible();
        await expect(digitalExperience.overviewAllFilters).toBeVisible();

        await digitalExperience.overviewAllFilters.click();
        await expect(
          digitalExperience.overviewFlyoutOption('pageUrl', 'https://otel-shop.example.com/')
        ).toBeChecked();
        await digitalExperience.overviewFiltersCancel.click();
      });

      await test.step('brings the filter buttons back when the window grows', async () => {
        await page.setViewportSize(WIDE_VIEWPORT);

        await expect(digitalExperience.overviewFilter('browser')).toBeVisible();
      });
    });

    test('expands the KQL bar over the row while it has the focus, and gives the row back after', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(digitalExperience.otelOverviewPageLoads).toContainText(
        testData.OTEL_SHOP_PAGE_LOADS
      );
      const widthOf = async (locator: Locator): Promise<number> =>
        Math.round((await locator.boundingBox())?.width ?? 0);
      const resting = await widthOf(digitalExperience.overviewKuery);

      await test.step('takes the width of the row, over the filters and the date picker', async () => {
        await digitalExperience.overviewKuery.click();

        await expect
          .poll(() => widthOf(digitalExperience.overviewKuery))
          .toBeGreaterThan(resting + 400);
        const bar = await digitalExperience.overviewKuery.boundingBox();
        const picker = await digitalExperience.overviewDatePicker.boundingBox();
        expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeGreaterThanOrEqual(
          (picker?.x ?? Infinity) + (picker?.width ?? 0) - 1
        );
      });

      await test.step('goes back to its place when the focus leaves', async () => {
        // The suggestions it opened cover the page, so the focus is taken away directly.
        await digitalExperience.overviewKuery.blur();

        await expect.poll(() => widthOf(digitalExperience.overviewKuery)).toBeLessThan(resting + 5);
        await expect(digitalExperience.overviewFilter('browser')).toBeVisible();
      });
    });

    test('makes the Trends panel as tall as the Core Web Vitals panel, with its charts filling it', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
        ...testData.TIME_RANGE,
        source: 'otel',
      });
      await expect(digitalExperience.otelOverviewPageLoads).toContainText(
        testData.OTEL_SHOP_PAGE_LOADS
      );
      await expect(digitalExperience.otelOverviewTrends).toBeVisible();

      await expect
        .poll(async () => {
          const vitals = await digitalExperience.otelOverviewVitals.boundingBox();
          const trends = await digitalExperience.otelOverviewTrends.boundingBox();
          return Math.abs((vitals?.height ?? 0) - (trends?.height ?? -1));
        })
        .toBeLessThan(2);

      // The last chart reaches the bottom of the panel, minus its padding, instead of leaving room.
      await expect
        .poll(async () => {
          const trends = await digitalExperience.otelOverviewTrends.boundingBox();
          const lastRow = await digitalExperience.otelOverviewLoadTimeTrend.boundingBox();
          return (
            (trends?.y ?? 0) + (trends?.height ?? 0) - ((lastRow?.y ?? 0) + (lastRow?.height ?? 0))
          );
        })
        .toBeLessThan(40);
    });
  }
);
