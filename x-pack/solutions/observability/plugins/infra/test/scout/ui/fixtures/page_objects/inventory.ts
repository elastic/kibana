/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type KibanaUrl, type Locator, type ScoutPage } from '@kbn/scout-oblt';

export class InventoryPage {
  public readonly feedbackLink: Locator;
  public readonly k8sFeedbackLink: Locator;

  public readonly datePickerInput: Locator;

  public readonly inventorySwitcherButton: Locator;
  public readonly inventorySwitcherHostsButton: Locator;
  public readonly inventorySwitcherPodsButton: Locator;
  public readonly inventorySwitcherContainersButton: Locator;

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

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.feedbackLink = this.page.getByTestId('infraInventoryFeedbackLink');
    this.k8sFeedbackLink = this.page.getByTestId('infra-kubernetes-feedback-link');

    this.datePickerInput = this.page.getByTestId('waffleDatePicker').getByRole('textbox');

    this.inventorySwitcherButton = this.page.getByTestId('openInventorySwitcher');
    this.inventorySwitcherHostsButton = this.page.getByTestId('goToHost');
    this.inventorySwitcherPodsButton = this.page.getByTestId('goToPods');
    this.inventorySwitcherContainersButton = this.page.getByTestId('goToContainer');

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
  }

  private async waitForNodesToLoad() {
    await this.page.getByTestId('infraNodesOverviewLoadingPanel').waitFor({ state: 'hidden' });
  }

  private async waitForPageToLoad() {
    await this.page.getByTestId('infraMetricsPage').waitFor();
    await this.waitForNodesToLoad();
    await this.page.getByTestId('savedViews-openPopover-loaded').waitFor();
  }

  public async goToPage(opts: { skipLoadWait?: boolean } = {}) {
    await this.page.goto(`${this.kbnUrl.app('metrics')}/inventory`);
    if (!opts.skipLoadWait) {
      await this.waitForPageToLoad();
    }
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
}
