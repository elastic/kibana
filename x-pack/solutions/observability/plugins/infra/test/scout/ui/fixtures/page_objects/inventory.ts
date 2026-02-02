/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type KibanaUrl, type Locator, type ScoutPage } from '@kbn/scout-oblt';
import {
  EXTENDED_TIMEOUT,
  KUBERNETES_TOUR_STORAGE_KEY,
  KUBERNETES_CARD_DISMISSED_STORAGE_KEY,
  KUBERNETES_TOAST_STORAGE_KEY,
} from '../constants';
import type { SavedViews } from './saved_views';

export class InventoryPage {
  public readonly feedbackLink: Locator;
  public readonly k8sFeedbackLink: Locator;

  public readonly datePickerInput: Locator;

  public readonly inventorySwitcherButton: Locator;
  public readonly inventorySwitcherHostsButton: Locator;
  public readonly inventorySwitcherPodsButton: Locator;
  public readonly inventorySwitcherContainersButton: Locator;

  public readonly metricSwitcherButton: Locator;
  public readonly metricsContextMenu: Locator;

  public readonly k8sTourText: Locator;
  public readonly k8sTourDismissButton: Locator;

  public readonly mapViewButton: Locator;
  public readonly waffleMap: Locator;
  public readonly toggleTimelineButton: Locator;
  public readonly timelineContainerClosed: Locator;
  public readonly timelineContainerOpen: Locator;

  public readonly tableViewButton: Locator;
  public readonly nodesOverviewTable: Locator;

  public readonly noDataPrompt: Locator;

  public readonly noDataPage: Locator;
  public readonly noDataPageActionButton: Locator;

  public readonly k8sPodWaffleContextMenu: Locator;

  public readonly alertsHeaderButton: Locator;
  public readonly alertsMenu: Locator;

  public readonly inventoryAlertsMenuOption: Locator;
  public readonly createInventoryRuleButton: Locator;

  public readonly metricsAlertsMenuOption: Locator;
  public readonly createMetricsThresholdRuleButton: Locator;

  public readonly customThresholdAlertMenuOption: Locator;

  public readonly alertsFlyout: Locator;
  public readonly alertsFlyoutRuleDefinitionSection: Locator;
  public readonly alertsFlyoutRuleTypeName: Locator;

  constructor(
    private readonly page: ScoutPage,
    private readonly kbnUrl: KibanaUrl,
    private readonly savedViews: SavedViews
  ) {
    this.feedbackLink = this.page.getByTestId('infraInventoryFeedbackLink');
    this.k8sFeedbackLink = this.page.getByTestId('infra-kubernetes-feedback-link');

    this.datePickerInput = this.page.getByTestId('waffleDatePicker').getByRole('textbox');

    this.inventorySwitcherButton = this.page.getByTestId('openInventorySwitcher');
    this.inventorySwitcherHostsButton = this.page.getByTestId('goToHost');
    this.inventorySwitcherPodsButton = this.page.getByTestId('goToPods');
    this.inventorySwitcherContainersButton = this.page.getByTestId('goToContainer');

    this.metricSwitcherButton = this.page.getByTestId('infraInventoryMetricDropdown');
    this.metricsContextMenu = this.page.getByTestId('infraInventoryMetricsContextMenu');

    this.k8sTourText = this.page.getByTestId('infra-kubernetesTour-text');
    this.k8sTourDismissButton = this.page.getByTestId('infra-kubernetesTour-dismiss');

    this.mapViewButton = this.page.getByRole('button', { name: 'Map view' });
    this.waffleMap = this.page.getByTestId('waffleMap');
    this.toggleTimelineButton = this.page.getByTestId('toggleTimelineButton');
    this.timelineContainerClosed = this.page.getByTestId('timelineContainerClosed');
    this.timelineContainerOpen = this.page.getByTestId('timelineContainerOpen');

    this.tableViewButton = this.page.getByRole('button', { name: 'Table view' });
    this.nodesOverviewTable = this.page.getByTestId('infraNodesOverviewTable');

    this.noDataPrompt = this.page.getByTestId('noMetricsDataPrompt');

    this.noDataPage = this.page.getByTestId('kbnNoDataPage');
    this.noDataPageActionButton = this.noDataPage.getByTestId('noDataDefaultActionButton');

    this.k8sPodWaffleContextMenu = this.page
      .getByRole('dialog')
      .filter({ hasText: 'Kubernetes Pod details' });

    this.alertsHeaderButton = this.page.getByTestId('infrastructure-alerts-and-rules');
    this.alertsMenu = this.page.getByTestId('metrics-alert-menu');

    this.inventoryAlertsMenuOption = this.alertsMenu.getByTestId('inventory-alerts-menu-option');
    this.createInventoryRuleButton = this.alertsMenu.getByTestId('inventory-alerts-create-rule');

    this.metricsAlertsMenuOption = this.alertsMenu.getByTestId(
      'metrics-threshold-alerts-menu-option'
    );
    this.createMetricsThresholdRuleButton = this.alertsMenu.getByTestId(
      'metrics-threshold-alerts-create-rule'
    );

    this.customThresholdAlertMenuOption = this.alertsMenu.getByTestId(
      'custom-threshold-alerts-menu-option'
    );

    this.alertsFlyout = this.page.getByRole('dialog').filter({ hasText: 'Create rule' });
    this.alertsFlyoutRuleDefinitionSection = this.alertsFlyout.getByTestId('ruleDefinition');
    this.alertsFlyoutRuleTypeName = this.alertsFlyout.getByTestId(
      'ruleDefinitionHeaderRuleTypeName'
    );
  }

  public async waitForNodesToLoad() {
    await this.page
      .getByTestId('infraNodesOverviewLoadingPanel')
      .waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
  }

  private async waitForPageToLoad() {
    await this.page.getByTestId('infraMetricsPage').waitFor({ timeout: EXTENDED_TIMEOUT });
    await this.waitForNodesToLoad();
    await this.savedViews.waitForViewsToLoad();
  }

  public async goToPage(opts: { skipLoadWait?: boolean } = {}) {
    await this.page.goto(`${this.kbnUrl.app('metrics')}/inventory`);
    if (!opts.skipLoadWait) {
      await this.waitForPageToLoad();
    }
  }

  public async goToPageWithSavedView(savedViewId: string) {
    const appUrl = `${this.kbnUrl.app('metrics')}/inventory`;

    const url = this.kbnUrl.get(appUrl, {
      params: {
        inventoryViewId: `'${savedViewId}'`,
      },
    });

    await this.page.goto(url);

    await this.waitForPageToLoad();
  }

  public async goToPageWithSavedViewAndAssetDetailsFlyout({
    savedViewId,
    assetId,
    entityType,
  }: {
    savedViewId: string;
    assetId: string;
    entityType: 'host' | 'container';
  }) {
    const appUrl = `${this.kbnUrl.app('metrics')}/inventory`;

    const url = this.kbnUrl.get(appUrl, {
      params: {
        assetDetailsFlyout: `(detailsItemId:${assetId},entityType:${entityType})`,
        inventoryViewId: `'${savedViewId}'`,
      },
    });

    await this.page.goto(url);

    await this.waitForPageToLoad();
  }

  public async reload() {
    await this.page.reload();
    await this.waitForPageToLoad();
  }

  public async toggleTimeline() {
    await this.toggleTimelineButton.click();
  }

  public async switchToTableView() {
    await this.tableViewButton.click();
  }

  public async switchToMapView() {
    await this.mapViewButton.click();
  }

  public async dismissK8sTour() {
    await this.k8sTourDismissButton.click();
  }

  public async addDismissK8sTourInitScript() {
    // Dismiss k8s tour if it's present to avoid interference with other test assertions
    await this.page.addInitScript(
      ([k8sTourStorageKey]) => {
        window.localStorage.setItem(k8sTourStorageKey, 'true');
      },
      [KUBERNETES_TOUR_STORAGE_KEY]
    );
  }

  public async addClearK8sCardDismissedInitScript() {
    // Clear the K8s dashboard promotion card dismissed state to ensure cards are visible
    await this.page.addInitScript(
      ([k8sCardDismissedKey]) => {
        window.localStorage.removeItem(k8sCardDismissedKey);
      },
      [KUBERNETES_CARD_DISMISSED_STORAGE_KEY]
    );
  }

  public async addDismissK8sToastInitScript() {
    // Dismiss k8s tour if it's present to avoid interference with other test assertions
    await this.page.addInitScript(
      ([k8sToastStorageKey]) => {
        window.localStorage.setItem(k8sToastStorageKey, 'true');
      },
      [KUBERNETES_TOAST_STORAGE_KEY]
    );
  }

  public async goToTime(time: string) {
    await this.datePickerInput.fill(time);
    await this.datePickerInput.press('Escape');
    await this.waitForNodesToLoad();
  }

  public async getWaffleNode(nodeName: string) {
    const container = this.waffleMap.getByTestId('nodeContainer').filter({ hasText: nodeName });

    return {
      container,
      name: container.getByTestId('nodeName'),
      value: container.getByTestId('nodeValue'),
    };
  }

  public async clickWaffleNode(nodeName: string) {
    const node = await this.getWaffleNode(nodeName);
    await node.container.click();
  }

  public async showHosts() {
    await this.inventorySwitcherButton.click();
    await this.inventorySwitcherHostsButton.click();
    await this.waitForNodesToLoad();
  }

  public async showPods() {
    await this.inventorySwitcherButton.click();
    await this.inventorySwitcherPodsButton.click();
    await this.waitForNodesToLoad();
  }

  public async showContainers() {
    await this.inventorySwitcherButton.click();
    await this.inventorySwitcherContainersButton.click();
    await this.waitForNodesToLoad();
  }

  public async clickNoDataPageAddDataButton() {
    await this.noDataPageActionButton.click();
  }

  public async filterByQueryBar(query: string) {
    const queryBar = this.page.getByTestId('queryInput');
    await queryBar.clear();
    await queryBar.fill(query);
    await queryBar.press('Enter');
    await this.waitForNodesToLoad();
  }

  public async selectPalette(
    palette: 'status' | 'temperature' | 'cool' | 'warm' | 'positive' | 'negative'
  ) {
    await this.page.getByTestId('openLegendControlsButton').click();
    await this.page.getByTestId('legendControlsPalette').selectOption(palette);
    await this.page.getByTestId('applyLegendControlsButton').click();
    await this.page
      .getByRole('dialog')
      .filter({ hasText: 'Legend Options' })
      .waitFor({ state: 'hidden' });
  }

  public async selectMetric(metricName: string) {
    await this.metricSwitcherButton.click();
    await this.metricsContextMenu.getByRole('button', { name: metricName }).click();
    await this.waitForNodesToLoad();
  }
}
