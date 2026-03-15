/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

/** Privileged User Monitoring page */
export class EntityAnalyticsPrivMonPage {
  constructor(private readonly page: ScoutPage) {}

  public get onboardingPanel(): Locator {
    return this.page.testSubj.locator('privilegedUserMonitoringOnboardingPanel');
  }

  public get onboardingCallout(): Locator {
    return this.page.testSubj.locator('privilegedUserMonitoringOnboardingCallout');
  }

  public get oktaIntegrationCard(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-okta-integration-card');
  }

  public get filePicker(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-file-picker');
  }

  public get addIndexCard(): Locator {
    return this.page.testSubj.locator('privilegedUserMonitoringAddIndexCard');
  }

  public get validationStep(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-validation-step');
  }

  public get importCsvCard(): Locator {
    return this.page.testSubj.locator('privilegedUserMonitoringImportCSVCard');
  }

  public get assignButton(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-assign-button');
  }

  public get updateButton(): Locator {
    return this.page.testSubj.locator('privileged-user-monitoring-update-button');
  }

  public get createIndexButton(): Locator {
    return this.page.testSubj.locator('create-index-button');
  }

  public get createIndexModalIndexName(): Locator {
    return this.page.testSubj.locator('createIndexModalIndexName');
  }

  public get createIndexModalCreateButton(): Locator {
    return this.page.testSubj.locator('createIndexModalCreateButton');
  }

  public get comboBoxToggleListButton(): Locator {
    return this.page.testSubj.locator('comboBoxToggleListButton');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics_privileged_user_monitoring');
    await waitForPageReady(this.page);
  }

  async clickOktaCard(): Promise<void> {
    await this.oktaIntegrationCard.first().click();
  }
}
