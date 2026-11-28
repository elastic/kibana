/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { spaceTest } from '../../fixtures';
import {
  DATE_WITH_DOCKER_DATA,
  DATE_WITH_DOCKER_DATA_TIMESTAMP,
  DATE_WITH_POD_DATA,
} from '../../fixtures/constants';

spaceTest.use({
  timezoneId: 'GMT',
});

spaceTest.describe(
  'Infrastructure Inventory - Saved Views',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let preloadedViewId = '';

    spaceTest.beforeAll(async ({ apiServices: { inventoryViews } }) => {
      const response = await inventoryViews.create({
        name: 'Preloaded View',
        nodeType: 'container',
        metric: { type: 'memory' },
        groupBy: [],
        view: 'table',
        customOptions: [],
        customMetrics: [],
        boundsOverride: {
          max: 1,
          min: 0,
        },
        autoBounds: true,
        accountId: '',
        region: '',
        legend: {
          palette: 'cool',
          reverseColors: false,
          steps: 10,
        },
        sort: {
          by: 'name',
          direction: 'desc',
        },
        timelineOpen: false,
        autoReload: false,
        filterQuery: {
          expression: '',
          kind: 'kuery',
        },
        preferredSchema: 'ecs',
        time: DATE_WITH_DOCKER_DATA_TIMESTAMP,
      });

      preloadedViewId = response.id;
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage }, kbnClient }) => {
      await browserAuth.loginAsPrivilegedUser();
      await kbnClient.uiSettings.updateGlobal({ hideAnnouncements: true });
      await inventoryPage.addDismissK8sTourInitScript();
    });

    spaceTest.afterEach(async ({ apiServices: { inventoryViews }, kbnClient }) => {
      await inventoryViews.deleteByName([
        'View without time',
        'View with time',
        'View to delete',
        'View to update',
        'View updated',
      ]);
      await inventoryViews.makeDefault('0'); // Reset to default view whose id is fixed to '0'
      // `beforeEach` writes `hideAnnouncements` via `updateGlobal` (global settings).
      // `unset` only deletes the per-space value, so restore the default globally instead.
      await kbnClient.uiSettings.updateGlobal({ hideAnnouncements: false });
    });

    spaceTest.afterAll(async ({ apiServices: { inventoryViews } }) => {
      await inventoryViews.deleteById(preloadedViewId);
    });

    spaceTest(
      "Load the 'Default view' when no saved view is selected",
      async ({ pageObjects: { savedViews, inventoryPage } }) => {
        await spaceTest.step("load 'Default View' on page load", async () => {
          await inventoryPage.goToPage();
          await expect(savedViews.selector).toHaveText('Default view');
        });

        await spaceTest.step("verify 'Default View' cannot be updated", async () => {
          await savedViews.selector.click();
          await expect(savedViews.updateViewButton).toBeDisabled();
        });

        await spaceTest.step(
          "verify 'Default View' is marked as default in manage views flyout",
          async () => {
            await savedViews.manageViewsButton.click();
            await savedViews.manageViewsFilterInput.pressSequentially('Default view');
            await expect(
              savedViews.manageViewsTable.getByTestId('infraRenderNameButton')
            ).toContainText('Default view');
            await expect(
              savedViews.manageViewsTable.getByTestId('infraRenderMakeDefaultActionButton-filled')
            ).toBeVisible();
          }
        );
      }
    );

    spaceTest(
      'Apply an existing saved view when it is selected in the URL',
      async ({ pageObjects: { savedViews, inventoryPage } }) => {
        await inventoryPage.goToPageWithSavedView(preloadedViewId);
        await expect(savedViews.selector).toHaveText('Preloaded View');
        await expect(inventoryPage.datePickerInput).toHaveValue(DATE_WITH_DOCKER_DATA);
        await expect(inventoryPage.tableViewButton).toHaveAttribute('aria-pressed', 'true');
        await expect(inventoryPage.nodesOverviewTable).toBeVisible();
        await expect(inventoryPage.inventorySwitcherButton).toHaveText('Docker Containers');
        await expect(inventoryPage.metricSwitcherButton).toHaveText('Memory usage');
      }
    );

    spaceTest(
      'Create a new saved view from the current inventory state without saving the time',
      async ({ page, pageObjects: { inventoryPage, savedViews } }) => {
        await spaceTest.step('configure some inventory state', async () => {
          await inventoryPage.goToPage();
          await inventoryPage.goToTime(DATE_WITH_POD_DATA);
          await inventoryPage.showPods();
          await inventoryPage.selectMetric('Inbound traffic');
          await inventoryPage.toggleTimeline();
        });

        await spaceTest.step('create a new saved view without saving the time', async () => {
          await savedViews.createView('View without time', { saveTime: false });
          await expect(savedViews.selector).toHaveText('View without time');

          const url = new URL(page.url());
          const inventoryViewId = url.searchParams.get('inventoryViewId')?.replace(/'/g, '');
          expect(inventoryViewId).toBeDefined();
          expect(inventoryViewId).not.toBe(0);

          // The saved time doesn't match the one we set before creating the view as time wasn't saved
          await expect(inventoryPage.datePickerInput).not.toHaveValue(DATE_WITH_POD_DATA);
        });
      }
    );

    spaceTest(
      'Create a new saved view from the current inventory state saving the time',
      async ({ page, pageObjects: { inventoryPage, savedViews } }) => {
        await spaceTest.step('configure some inventory state', async () => {
          await inventoryPage.goToPage();
          await inventoryPage.goToTime(DATE_WITH_DOCKER_DATA);
          await inventoryPage.showContainers();
          await inventoryPage.selectMetric('Outbound traffic');
        });

        await spaceTest.step('create a new saved view saving the time', async () => {
          await savedViews.createView('View with time', { saveTime: true });
          await expect(savedViews.selector).toHaveText('View with time');

          const url = new URL(page.url());
          const inventoryViewId = url.searchParams.get('inventoryViewId')?.replace(/'/g, '');
          expect(inventoryViewId).toBeDefined();
          expect(inventoryViewId).not.toBe(0);

          // The saved time should match the one we set before creating the view
          await expect(inventoryPage.datePickerInput).toHaveValue(DATE_WITH_DOCKER_DATA);
          await expect(inventoryPage.waffleMap).toBeVisible();
        });
      }
    );

    spaceTest(
      'Select and load an existing saved view from the manage views flyout',
      async ({ pageObjects: { inventoryPage, savedViews } }) => {
        await spaceTest.step('land on inventory page loading the default view', async () => {
          await inventoryPage.goToPage();
          await expect(savedViews.selector).toHaveText('Default view');
        });

        await spaceTest.step('open manage views flyout', async () => {
          await savedViews.selector.click();
          await savedViews.manageViewsButton.click();
          await expect(savedViews.manageViewsFlyout).toBeVisible();
        });

        await spaceTest.step("filter views table and select 'Preloaded View'", async () => {
          await savedViews.manageViewsFilterInput.pressSequentially('Preloaded View');
          const viewLocator = savedViews.manageViewsTable.getByTestId('infraRenderNameButton');
          await expect(viewLocator).toContainText('Preloaded View');
          await viewLocator.click();
          await savedViews.waitForViewsToLoad();
          await inventoryPage.waitForNodesToLoad();
        });

        await spaceTest.step("verify 'Preloaded View' is applied", async () => {
          await expect(savedViews.manageViewsFlyout).toBeHidden();
          await expect(savedViews.selector).toHaveText('Preloaded View');
          await expect(inventoryPage.datePickerInput).toHaveValue(DATE_WITH_DOCKER_DATA);
          await expect(inventoryPage.tableViewButton).toHaveAttribute('aria-pressed', 'true');
          await expect(inventoryPage.nodesOverviewTable).toBeVisible();
          await expect(inventoryPage.inventorySwitcherButton).toHaveText('Docker Containers');
          await expect(inventoryPage.metricSwitcherButton).toHaveText('Memory usage');
        });
      }
    );

    spaceTest(
      'Can make a saved view the default view from the manage views flyout',
      async ({ pageObjects: { inventoryPage, savedViews, toasts } }) => {
        await spaceTest.step('land on inventory page loading the default view', async () => {
          await inventoryPage.goToPage();
          await expect(savedViews.selector).toHaveText('Default view');
        });

        await spaceTest.step('open manage views flyout', async () => {
          await savedViews.selector.click();
          await savedViews.manageViewsButton.click();
          await expect(savedViews.manageViewsFlyout).toBeVisible();
        });

        await spaceTest.step(
          "filter views table and make 'Preloaded View' the default view",
          async () => {
            await savedViews.manageViewsFilterInput.pressSequentially('Preloaded View');
            const makeDefaultButton = savedViews.manageViewsTable.getByTestId(
              'infraRenderMakeDefaultActionButton-empty'
            );
            await expect(makeDefaultButton).toBeVisible();
            await makeDefaultButton.click();
            await toasts.waitFor();
            expect(await toasts.getHeaderText()).toBe('Metrics settings successfully updated');
            await expect(
              savedViews.manageViewsTable.getByTestId('infraRenderMakeDefaultActionButton-filled')
            ).toBeVisible();
          }
        );
      }
    );

    spaceTest(
      'Delete a saved view from the manage views flyout',
      async ({ apiServices: { inventoryViews }, pageObjects: { inventoryPage, savedViews } }) => {
        await inventoryViews.create({
          name: 'View to delete',
          nodeType: 'container',
          metric: { type: 'memory' },
          groupBy: [],
          view: 'table',
          customOptions: [],
          customMetrics: [],
          boundsOverride: {
            max: 1,
            min: 0,
          },
          autoBounds: true,
          accountId: '',
          region: '',
          legend: {
            palette: 'cool',
            reverseColors: false,
            steps: 10,
          },
          sort: {
            by: 'name',
            direction: 'desc',
          },
          timelineOpen: false,
          autoReload: false,
          filterQuery: {
            expression: '',
            kind: 'kuery',
          },
          preferredSchema: 'ecs',
        });

        await spaceTest.step('navigate page and open manage views flyout', async () => {
          await inventoryPage.goToPage();
          await savedViews.selector.click();
          await savedViews.manageViewsButton.click();
          await expect(savedViews.manageViewsFlyout).toBeVisible();
        });

        await spaceTest.step("filter views table and delete 'View to delete'", async () => {
          await savedViews.manageViewsFilterInput.pressSequentially('View to delete');
          const nameLocator = savedViews.manageViewsTable
            .getByTestId('infraRenderNameButton')
            .filter({ hasText: 'View to delete' });
          await expect(nameLocator).toBeVisible();
          await savedViews.manageViewsTable.getByTestId('infraDeleteConfirmationButton').click();
          await savedViews.manageViewsTable.getByTestId('showConfirm').click();
          await expect(nameLocator).toBeHidden();
        });
      }
    );

    spaceTest(
      'Update a saved view from the manage views flyout',
      async ({ apiServices: { inventoryViews }, pageObjects: { inventoryPage, savedViews } }) => {
        const response = await inventoryViews.create({
          name: 'View to update',
          nodeType: 'container',
          metric: { type: 'memory' },
          groupBy: [],
          view: 'table',
          customOptions: [],
          customMetrics: [],
          boundsOverride: {
            max: 1,
            min: 0,
          },
          autoBounds: true,
          accountId: '',
          region: '',
          legend: {
            palette: 'cool',
            reverseColors: false,
            steps: 10,
          },
          sort: {
            by: 'name',
            direction: 'desc',
          },
          timelineOpen: false,
          autoReload: false,
          filterQuery: {
            expression: '',
            kind: 'kuery',
          },
          preferredSchema: 'ecs',
        });
        const viewId = response.id;

        await spaceTest.step('navigate page with preloaded view', async () => {
          await inventoryPage.goToPageWithSavedView(viewId);
          await expect(savedViews.selector).toHaveText('View to update');
        });

        await spaceTest.step('change inventory state and update view', async () => {
          await inventoryPage.showHosts();
          await savedViews.saveCurrentView('View updated');
          await expect(savedViews.selector).toHaveText('View updated');
          await expect(inventoryPage.inventorySwitcherButton).toHaveText('Hosts');
        });
      }
    );
  }
);
