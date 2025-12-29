/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  expect,
  type KibanaUrl,
  type Locator,
  type ScoutPage,
  type Request,
} from '@kbn/scout-oblt';

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
  }

  private async startWaitingForSnapshotRequest() {
    // Once the page has loaded once, visual loading indicator doesn't always appear on subsequent loads.
    // So we need to wait for the network request too to ensure new data has been retrieved.
    return this.page.waitForRequest((request) => request.url().includes('/api/metrics/snapshot'));
  }

  private async waitForNodesToLoad(snapshotPromise?: Promise<Request>) {
    const panelPromise = this.page
      .getByTestId('infraNodesOverviewLoadingPanel')
      .waitFor({ state: 'hidden' });

    if (snapshotPromise) {
      await Promise.all([panelPromise, snapshotPromise]);
    } else {
      await panelPromise;
    }
  }

  private async waitForPageToLoad() {
    await this.page.getByTestId('infraMetricsPage').waitFor();
    await this.waitForNodesToLoad();
  }

  public async goToPage() {
    await this.page.goto(`${this.kbnUrl.app('metrics')}/inventory`);
    await this.waitForPageToLoad();
  }

  public async reload() {
    await this.page.reload();
    await this.waitForPageToLoad();
  }

  public async toggleTimeline() {
    await expect(this.toggleTimelineButton).toBeVisible();
    await this.toggleTimelineButton.click();
  }

  public async switchToTableView() {
    await expect(this.tableViewButton).toBeVisible();
    await this.tableViewButton.click();
  }

  public async switchToMapView() {
    await expect(this.mapViewButton).toBeVisible();
    await this.mapViewButton.click();
  }

  public async dismissK8sTour() {
    await expect(this.k8sTourDismissButton).toBeVisible();
    await this.k8sTourDismissButton.click();
  }

  public async goToTime(time: string) {
    await expect(this.datePickerInput).toBeVisible();
    await this.datePickerInput.focus();
    await this.datePickerInput.clear();
    const requestPromise = this.startWaitingForSnapshotRequest();
    await this.datePickerInput.fill(time);
    await this.datePickerInput.press('Enter');
    await this.waitForNodesToLoad(requestPromise);
  }

  public async getWaffleNodes() {
    const containers = await this.waffleMap.getByTestId('nodeContainer').all();

    return containers.map((container) => ({
      container,
      name: container.getByTestId('nodeName'),
      value: container.getByTestId('nodeValue'),
    }));
  }

  public async goToHosts() {
    await expect(this.inventorySwitcherButton).toBeVisible();
    await this.inventorySwitcherButton.click();
    await expect(this.inventorySwitcherHostsButton).toBeVisible();
    const requestPromise = this.startWaitingForSnapshotRequest();
    await this.inventorySwitcherHostsButton.click();
    await this.waitForNodesToLoad(requestPromise);
  }

  public async goToPods() {
    await expect(this.inventorySwitcherButton).toBeVisible();
    await this.inventorySwitcherButton.click();
    await expect(this.inventorySwitcherPodsButton).toBeVisible();
    const requestPromise = this.startWaitingForSnapshotRequest();
    await this.inventorySwitcherPodsButton.click();
    await this.waitForNodesToLoad(requestPromise);
  }

  public async goToContainers() {
    await expect(this.inventorySwitcherButton).toBeVisible();
    await this.inventorySwitcherButton.click();
    await expect(this.inventorySwitcherContainersButton).toBeVisible();
    const requestPromise = this.startWaitingForSnapshotRequest();
    await this.inventorySwitcherContainersButton.click();
    await this.waitForNodesToLoad(requestPromise);
  }
}
