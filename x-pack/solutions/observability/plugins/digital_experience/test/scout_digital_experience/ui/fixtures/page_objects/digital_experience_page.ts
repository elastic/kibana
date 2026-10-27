/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { TIME_RANGE } from '../constants';

const APP_PATH = '/app/digital_experience';

export class DigitalExperiencePage {
  public readonly mainContainer: Locator;
  public readonly applicationsTable: Locator;
  public readonly applicationsUnavailable: Locator;
  public readonly overviewEmpty: Locator;
  public readonly overviewTab: Locator;
  public readonly breadcrumbs: Locator;
  public readonly navEntry: Locator;
  public readonly legacyNavEntry: Locator;
  public readonly projectNavEntry: Locator;
  public readonly apmTracesNavEntry: Locator;
  public readonly fatalErrorScreen: Locator;
  public readonly appNotFound: Locator;
  public readonly permissionDenied: Locator;
  public readonly classicRumPageLoadMetric: Locator;
  public readonly classicRumServiceSelect: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.mainContainer = page.getByTestId('digitalExperienceMainContainer');
    this.applicationsTable = page.getByTestId('digitalExperienceApplicationsTable');
    this.applicationsUnavailable = page.getByTestId('digitalExperienceApplicationsUnavailable');
    this.overviewEmpty = page.getByTestId('digitalExperienceOverviewEmpty');
    this.overviewTab = page.getByTestId('digitalExperienceTab-overview');
    this.breadcrumbs = page.getByTestId('breadcrumbs');
    this.navEntry = page.getByTestId('observability-nav-digital_experience-applications');
    this.legacyNavEntry = page.getByTestId('observability-nav-ux-dashboard');
    this.projectNavEntry = page.getByTestId(/nav-item-deepLinkId-digital_experience/);
    this.apmTracesNavEntry = page.getByTestId('observability-nav-apm-traces');
    this.fatalErrorScreen = page.getByTestId('fatalErrorScreen');
    this.appNotFound = page.getByTestId('appNotFoundPageContent');
    // The server denies the app route itself when the role has no digital_experience privilege.
    this.permissionDenied = page.getByTestId('ResetSessionButton');
    this.classicRumPageLoadMetric = page.getByTestId('uxClientMetrics-totalPageLoad');
    this.classicRumServiceSelect = page.getByTestId('uxServiceNameFilterSelect');
  }

  async gotoApplications(timeRange = TIME_RANGE): Promise<void> {
    await this.page.goto(this.kbnUrl.get(`${APP_PATH}?${new URLSearchParams(timeRange)}`));
  }

  async gotoApplication(serviceName: string, timeRange = TIME_RANGE): Promise<void> {
    await this.page.goto(
      this.kbnUrl.get(`${APP_PATH}/${serviceName}?${new URLSearchParams(timeRange)}`)
    );
  }

  async gotoLegacyUserExperience(): Promise<void> {
    await this.page.goto(this.kbnUrl.get('/app/ux'));
  }

  applicationLink(serviceName: string): Locator {
    return this.applicationsTable.getByRole('link', { name: serviceName });
  }

  breadcrumbLink(name: string): Locator {
    return this.breadcrumbs.getByRole('link', { name });
  }
}
