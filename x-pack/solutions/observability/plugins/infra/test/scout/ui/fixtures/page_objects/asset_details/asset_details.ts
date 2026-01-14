/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLazyPageObject, type KibanaUrl, type ScoutPage } from '@kbn/scout-oblt';
import { OverviewTab } from './overview_tab';
import { MetadataTab } from './metadata_tab';
import { MetricsTab } from './metrics_tab';

export class AssetDetailsPage {
  public readonly overviewTab: OverviewTab;
  public readonly metadataTab: MetadataTab;
  public readonly metricsTab: MetricsTab;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.overviewTab = createLazyPageObject(OverviewTab, this.page, this.kbnUrl);
    this.metadataTab = createLazyPageObject(MetadataTab, this.page, this.kbnUrl);
    this.metricsTab = createLazyPageObject(MetricsTab, this.page, this.kbnUrl);
  }
}
