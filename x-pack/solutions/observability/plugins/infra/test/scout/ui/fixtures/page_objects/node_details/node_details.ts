/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import rison from '@kbn/rison';
import { type KibanaUrl, type Locator, type ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../../constants';

interface QueryParams {
  name?: string;
  alertMetric?: string;
  from?: Moment;
  to?: Moment;
}

export class NodeDetailsPage {
  // Tab locators
  public readonly overviewTab: Locator;
  public readonly metadataTab: Locator;
  public readonly metricsTab: Locator;
  public readonly processesTab: Locator;
  public readonly logsTab: Locator;
  public readonly anomaliesTab: Locator;
  public readonly osqueryTab: Locator;

  // Metadata tab elements
  public readonly metadataTable: Locator;

  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    // Tabs
    this.overviewTab = this.page.testSubj.locator('infraAssetDetailsOverviewTab');
    this.metadataTab = this.page.testSubj.locator('infraAssetDetailsMetadataTab');
    this.metricsTab = this.page.testSubj.locator('infraAssetDetailsMetricsTab');
    this.processesTab = this.page.testSubj.locator('infraAssetDetailsProcessesTab');
    this.logsTab = this.page.testSubj.locator('infraAssetDetailsLogsTab');
    this.anomaliesTab = this.page.testSubj.locator('infraAssetDetailsAnomaliesTab');
    this.osqueryTab = this.page.testSubj.locator('infraAssetDetailsOsqueryTab');

    this.metadataTable = this.page.testSubj.locator('infraAssetDetailsMetadataTable');
  }

  private getNodeDetailsUrl(queryParams?: QueryParams): string {
    if (!queryParams) {
      return '';
    }

    const { from, to, name, alertMetric } = queryParams;
    const assetDetails: Record<string, unknown> = {};

    // Add dateRange if from and to are provided
    if (from && to) {
      assetDetails.dateRange = {
        from: from.toISOString(),
        to: to.toISOString(),
      };
    }

    // Add other fields at the top level
    if (name) {
      assetDetails.name = name;
    }

    if (alertMetric) {
      assetDetails.alertMetric = alertMetric;
    }

    // Set defaults
    assetDetails.preferredSchema = 'semconv';
    assetDetails.tabId = 'overview';

    return rison.encodeUnknown(assetDetails) || '';
  }

  public async goToPage(
    entityId: string,
    entityType: 'host' | 'container',
    queryParams?: QueryParams
  ) {
    const assetDetailsParam = this.getNodeDetailsUrl(queryParams);

    const url = `${this.kbnUrl.app(
      'metrics'
    )}/detail/${entityType}/${entityId}?assetDetails=${assetDetailsParam}`;

    // Tab content is gated by the async POST /api/infra/metadata call; await it so the page is
    // fully mounted before tests assert on it.
    const metadataResponse = this.page.waitForResponse(
      (response) => response.url().includes('/api/infra/metadata'),
      { timeout: EXTENDED_TIMEOUT }
    );
    await this.page.goto(url);
    // Wait for the page to load - check for overview tab or any tab to be visible
    await this.overviewTab.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await metadataResponse;
  }

  public async refreshPage() {
    await this.page.reload();
    await this.overviewTab.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  // Tab navigation
  public async clickOverviewTab() {
    await this.overviewTab.click();
  }

  public async clickMetadataTab() {
    await this.metadataTab.click();
  }

  public async clickMetricsTab() {
    await this.metricsTab.click();
  }

  public async clickProcessesTab() {
    await this.processesTab.click();
  }

  public async clickLogsTab() {
    await this.logsTab.click();
  }

  public async clickAnomaliesTab() {
    await this.anomaliesTab.click();
  }
}
