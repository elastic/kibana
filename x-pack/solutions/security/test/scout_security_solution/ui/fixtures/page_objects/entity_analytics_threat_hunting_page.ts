/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

/** Threat Hunting page */
export class EntityAnalyticsThreatHuntingPage {
  constructor(private readonly page: ScoutPage) {}

  public get pageTitle(): Locator {
    return this.page.testSubj.locator('threatHuntingPage');
  }

  public get combinedRiskDonutChart(): Locator {
    return this.page.testSubj.locator('risk-score-donut-chart');
  }

  public get anomaliesPlaceholderPanel(): Locator {
    return this.page.testSubj.locator('anomalies-placeholder-panel');
  }

  public get threatHuntingEntitiesTable(): Locator {
    return this.page.locator('[data-test-subj*="threat-hunting-entities-table-loading"]');
  }

  public get threatHuntingEntitiesTableLoaded(): Locator {
    return this.page.testSubj.locator('threat-hunting-entities-table-loading-false');
  }

  public get timelineIcon(): Locator {
    return this.page.testSubj.locator('threat-hunting-timeline-icon');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics_threat_hunting');
    await waitForPageReady(this.page);
  }
}
