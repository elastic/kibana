/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrService } from '../../functional/ftr_provider_context';

const ALERT_TABLE_ROW_CSS_SELECTOR = '[data-test-subj="alertsTable"] .euiDataGridRow';
const VISUALIZATIONS_SECTION_HEADER_TEST_ID = 'securitySolutionFlyoutVisualizationsHeader';
const GRAPH_PREVIEW_TEST_ID = 'securitySolutionFlyoutGraphPreview';
const GRAPH_PREVIEW_LOADING_TEST_ID = 'securitySolutionFlyoutGraphPreviewLoading';

export class AlertsPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly pageObjects = this.ctx.getPageObjects(['common', 'header']);
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly defaultTimeoutMs = this.ctx.getService('config').get('timeouts.waitFor');

  async navigateToAlertsPage(urlQueryParams: string = ''): Promise<void> {
    await this.pageObjects.common.navigateToUrlWithBrowserHistory(
      'securitySolution',
      '/alerts',
      `${urlQueryParams && `?${urlQueryParams}`}`,
      {
        ensureCurrentUrl: false,
      }
    );
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  getAbsoluteTimerangeFilter(from: string, to: string) {
    return `timerange=(global:(linkTo:!(),timerange:(from:%27${from}%27,kind:absolute,to:%27${to}%27)))`;
  }

  getFlyoutFilter(alertId: string) {
    return `flyout=(preview:!(),right:(id:document-details-right,params:(id:%27${alertId}%27,indexName:.internal.alerts-security.alerts-default-000001,scopeId:alerts-page)))`;
  }

  /**
   * Clicks the refresh button on the Alerts page and waits for it to complete
   */
  async clickRefresh(): Promise<void> {
    await this.ensureOnAlertsPage();
    await this.testSubjects.click('querySubmitButton');

    // wait for refresh to complete
    await this.retry.waitFor(
      'Alerts pages refresh button to be enabled',
      async (): Promise<boolean> => {
        const refreshButton = await this.testSubjects.find('querySubmitButton');

        return (await refreshButton.isDisplayed()) && (await refreshButton.isEnabled());
      }
    );
  }

  async ensureOnAlertsPage(): Promise<void> {
    await this.testSubjects.existOrFail('detectionsAlertsPage');
  }

  async waitForListToHaveAlerts(timeoutMs?: number): Promise<void> {
    const allEventRows = await this.testSubjects.findService.allByCssSelector(
      ALERT_TABLE_ROW_CSS_SELECTOR
    );

    if (!Boolean(allEventRows.length)) {
      await this.retry.waitForWithTimeout(
        'waiting for alerts to show up on alerts page',
        timeoutMs ?? this.defaultTimeoutMs,
        async (): Promise<boolean> => {
          await this.clickRefresh();

          const allEventRowsInner = await this.testSubjects.findService.allByCssSelector(
            ALERT_TABLE_ROW_CSS_SELECTOR
          );

          return Boolean(allEventRowsInner.length);
        }
      );
    }
  }

  flyout = {
    expandVisualizations: async (): Promise<void> => {
      await this.testSubjects.click(VISUALIZATIONS_SECTION_HEADER_TEST_ID);
    },

    assertGraphPreviewVisible: async () => {
      return await this.testSubjects.existOrFail(GRAPH_PREVIEW_TEST_ID);
    },

    assertGraphNodesNumber: async (expected: number) => {
      await this.flyout.waitGraphIsLoaded();
      const graph = await this.testSubjects.find(GRAPH_PREVIEW_TEST_ID);
      await graph.scrollIntoView();
      const nodes = await graph.findAllByCssSelector('.react-flow__nodes .react-flow__node');
      expect(nodes.length).to.be(expected);
    },

    waitGraphIsLoaded: async () => {
      await this.testSubjects.missingOrFail(GRAPH_PREVIEW_LOADING_TEST_ID, { timeout: 10000 });
    },
  };
}
