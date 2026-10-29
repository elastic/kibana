/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiBasicTableObject,
  EuiSelectableObject,
  KibanaUrl,
  Locator,
  ScoutPage,
} from '@kbn/scout-oblt';
import { TIME_RANGE } from '../../../common/fixtures/constants';

const APP_PATH = '/app/digital_experience';

export class DigitalExperiencePage {
  public readonly mainContainer: Locator;
  public readonly applicationsTable: EuiBasicTableObject;
  public readonly environmentFilter: Locator;
  public readonly environmentList: EuiSelectableObject;
  public readonly sourceFilter: Locator;
  public readonly sourceList: EuiSelectableObject;
  public readonly search: Locator;
  public readonly summary: Locator;
  public readonly pageLoadsChart: Locator;
  public readonly otelOverviewKpis: Locator;
  public readonly otelOverviewPageLoads: Locator;
  public readonly overviewEmpty: Locator;
  public readonly overviewTab: Locator;
  public readonly sessionsTab: Locator;
  public readonly sessionsTable: EuiBasicTableObject;
  public readonly sessionsSearch: Locator;
  public readonly sessionsErrorsFilter: Locator;
  public readonly sessionsClearFilters: Locator;
  public readonly sessionsKpis: Locator;
  public readonly sessionsEmpty: Locator;
  public readonly sessionSummary: Locator;
  public readonly sessionWaterfallSegments: Locator;
  public readonly sessionWaterfallErrors: Locator;
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
    this.applicationsTable = page.components.basicTable('digitalExperienceApplicationsTable');
    this.environmentFilter = page.getByTestId('digitalExperienceEnvironmentFilter');
    this.environmentList = page.components.selectable('digitalExperienceEnvironmentFilterList');
    this.sourceFilter = page.getByTestId('digitalExperienceSourceFilter');
    this.sourceList = page.components.selectable('digitalExperienceSourceFilterList');
    this.search = page.getByTestId('digitalExperienceApplicationsSearch');
    this.summary = page.getByTestId('digitalExperienceApplicationsSummary');
    this.pageLoadsChart = page.getByTestId('digitalExperiencePageLoadsChart');
    this.otelOverviewKpis = page.getByTestId('digitalExperienceOverviewKpis');
    this.otelOverviewPageLoads = page.getByTestId('digitalExperienceOverviewPageLoads');
    this.overviewEmpty = page.getByTestId('digitalExperienceOverviewEmpty');
    this.overviewTab = page.getByTestId('digitalExperienceTab-overview');
    this.sessionsTab = page.getByTestId('digitalExperienceTab-sessions');
    this.sessionsTable = page.components.basicTable('digitalExperienceSessionsTable');
    this.sessionsSearch = page.getByTestId('digitalExperienceSessionsSearch');
    this.sessionsErrorsFilter = page.getByTestId('digitalExperienceSessionsErrorsFilter');
    this.sessionsClearFilters = page.getByTestId('digitalExperienceSessionsClearFilters');
    this.sessionsKpis = page.getByTestId('digitalExperienceSessionsKpis');
    this.sessionsEmpty = page.getByTestId('digitalExperienceSessionsEmpty');
    this.sessionSummary = page.getByTestId('digitalExperienceSessionSummary');
    this.sessionWaterfallSegments = page.getByTestId('digitalExperienceSessionWaterfallSegment');
    this.sessionWaterfallErrors = page.getByTestId('digitalExperienceSessionWaterfallError');
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

  /** Opens the list with the given URL query, by default only the time range. */
  async gotoApplications(query: Record<string, string> = TIME_RANGE): Promise<void> {
    await this.page.goto(this.kbnUrl.get(`${APP_PATH}?${new URLSearchParams(query)}`));
  }

  async gotoApplication(serviceName: string, timeRange = TIME_RANGE): Promise<void> {
    await this.page.goto(
      this.kbnUrl.get(`${APP_PATH}/${serviceName}?${new URLSearchParams(timeRange)}`)
    );
  }

  /** Opens the Sessions tab of an EDOT Browser application, with more list params if given. */
  async gotoSessions(
    serviceName: string,
    query: Record<string, string> = {},
    timeRange: Record<string, string> = TIME_RANGE
  ): Promise<void> {
    const search = new URLSearchParams({ ...timeRange, source: 'otel', ...query });
    await this.page.goto(this.kbnUrl.get(`${APP_PATH}/${serviceName}/sessions?${search}`));
  }

  async gotoLegacyUserExperience(): Promise<void> {
    await this.page.goto(this.kbnUrl.get('/app/ux'));
  }

  applicationLink(serviceName: string): Locator {
    // By text, not accessible name: a search highlight adds screen-reader markers to the name.
    return this.applicationsTable.rows
      .getByTestId('digitalExperienceApplicationLink')
      .filter({ hasText: serviceName });
  }

  applicationRow(serviceName: string): Locator {
    return this.applicationsTable.rows.filter({
      has: this.page.getByRole('link', { name: serviceName, exact: true }),
    });
  }

  classicDataHint(serviceName: string): Locator {
    return this.applicationRow(serviceName).getByTestId('digitalExperienceClassicDataHint');
  }

  /** Picks an environment by its label, e.g. `staging` or `Not defined`. */
  async selectEnvironment(label: string): Promise<void> {
    await this.environmentFilter.click();
    await this.environmentList.selectOption(label);
  }

  /** Shows one source, e.g. `Classic RUM`, or `All sources`. */
  async selectSource(label: string): Promise<void> {
    await this.sourceFilter.click();
    await this.sourceList.selectOption(label);
  }

  sessionRow(sessionId: string): Locator {
    return this.page.getByTestId(`digitalExperienceSessionRow-${sessionId}`);
  }

  sessionLink(sessionId: string): Locator {
    return this.sessionRow(sessionId).getByTestId('digitalExperienceSessionLink');
  }

  sessionsKpi(
    id: 'total' | 'withErrors' | 'medianDuration' | 'avgPageViews' | 'bounceRate'
  ): Locator {
    return this.page.getByTestId(`digitalExperienceSessionsKpi-${id}`);
  }

  /** Narrows the sessions to one value of a facet, e.g. `('browser', 'Firefox')`. */
  async selectSessionsFacet(
    facet: 'browser' | 'os' | 'country' | 'entryPage',
    value: string
  ): Promise<void> {
    const testSubj = `digitalExperienceSessionsFacet-${facet}`;
    await this.page.getByTestId(testSubj).click();
    await this.page.getByTestId(`${testSubj}Option-${value}`).click();
  }

  async gotoSessionsPage(pageNumber: number): Promise<void> {
    await this.page.getByTestId(`pagination-button-${pageNumber - 1}`).click();
  }

  breadcrumbLink(name: string): Locator {
    return this.breadcrumbs.getByRole('link', { name });
  }
}
