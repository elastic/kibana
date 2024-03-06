/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../../../functional/ftr_provider_context';

const ALERT_TABLE_ROW_CSS_SELECTOR = '[data-test-subj="alertsTable"] .euiDataGridRow';

export class DetectionsPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly common = this.ctx.getPageObject('common');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly headerPageObjects = this.ctx.getPageObject('header');
  private readonly retry = this.ctx.getService('retry');
  private readonly defaultTimeoutMs = this.ctx.getService('config').get('timeouts.waitFor');

  async navigateHome(): Promise<void> {
    await this.navigateToDetectionsPage();
  }

  /**
   * Navigate to the Alerts list page.
   * @param searchParams
   *
   * @example
   *
   * // filter list by alert only for a given host name
   * navigateToAlerts(`query=(language:kuery,query:'host.hostname: "HOST-abc"')`)
   */
  async navigateToAlerts(searchParams: string = ''): Promise<void> {
    await this.common.navigateToUrlWithBrowserHistory('securitySolution', '/alerts', searchParams, {
      ensureCurrentUrl: !Boolean(searchParams),
    });
    await this.headerPageObjects.waitUntilLoadingHasFinished();
  }

  async navigateToRules(): Promise<void> {
    await this.navigateToDetectionsPage('rules');
  }

  async navigateToCreateRule(): Promise<void> {
    await this.navigateToDetectionsPage('rules/create');
  }

  async replaceIndexPattern(): Promise<void> {
    const buttons = await this.find.allByCssSelector('[data-test-subj="comboBoxInput"] button');
    await buttons.map(async (button: WebElementWrapper) => await button.click());
    await this.testSubjects.setValue('comboBoxSearchInput', '*');
  }

  async openImportQueryModal(): Promise<void> {
    const element = await this.testSubjects.find('importQueryFromSavedTimeline');
    await element.click(500);
    await this.testSubjects.exists('open-timeline-modal-body-filter-default');
  }

  async viewTemplatesInImportQueryModal(): Promise<void> {
    await this.common.clickAndValidate(
      'open-timeline-modal-body-filter-template',
      'timelines-table'
    );
  }

  async closeImportQueryModal(): Promise<void> {
    await this.find.clickByCssSelector('.euiButtonIcon.euiModal__closeIcon');
  }

  async selectMachineLearningJob(): Promise<void> {
    await this.find.clickByCssSelector('[data-test-subj="mlJobSelect"] button');
    await this.find.clickByCssSelector('#high_distinct_count_error_message');
  }

  async openAddFilterPopover(): Promise<void> {
    const addButtons = await this.testSubjects.findAll('addFilter');
    await addButtons[1].click();
    await this.testSubjects.exists('saveFilter');
  }

  async closeAddFilterPopover(): Promise<void> {
    await this.testSubjects.click('cancelSaveFilter');
  }

  async toggleFilterActions(): Promise<void> {
    const filterActions = await this.testSubjects.findAll('addFilter');
    await filterActions[1].click();
  }

  async toggleSavedQueries(): Promise<void> {
    const filterActions = await this.find.allByCssSelector(
      '[data-test-subj="saved-query-management-popover-button"]'
    );
    await filterActions[1].click();
  }

  async addNameAndDescription(
    name: string = 'test rule name',
    description: string = 'test rule description'
  ): Promise<void> {
    await this.find.setValue(`[aria-describedby="detectionEngineStepAboutRuleName"]`, name, 500);
    await this.find.setValue(
      `[aria-describedby="detectionEngineStepAboutRuleDescription"]`,
      description,
      500
    );
  }

  async goBackToAllRules(): Promise<void> {
    await this.common.clickAndValidate('ruleDetailsBackToAllRules', 'create-new-rule');
  }

  async revealAdvancedSettings(): Promise<void> {
    await this.common.clickAndValidate(
      'advancedSettings',
      'detectionEngineStepAboutRuleReferenceUrls'
    );
  }

  async preview(): Promise<void> {
    await this.common.clickAndValidate(
      'previewSubmitButton',
      'queryPreviewCustomHistogram',
      undefined,
      500
    );
  }

  async continue(prefix: string): Promise<void> {
    await this.testSubjects.click(`${prefix}-continue`);
  }

  async addCustomQuery(query: string): Promise<void> {
    await this.testSubjects.setValue('queryInput', query, undefined, 500);
  }

  async selectMLRule(): Promise<void> {
    await this.common.clickAndValidate('machineLearningRuleType', 'mlJobSelect');
  }

  async selectEQLRule(): Promise<void> {
    await this.common.clickAndValidate('eqlRuleType', 'eqlQueryBarTextInput');
  }

  async selectIndicatorMatchRule(): Promise<void> {
    await this.common.clickAndValidate('threatMatchRuleType', 'comboBoxInput');
  }

  async selectThresholdRule(): Promise<void> {
    await this.common.clickAndValidate('thresholdRuleType', 'input');
  }

  async ensureOnAlertsPage(): Promise<void> {
    await this.testSubjects.existOrFail('detectionsAlertsPage');
  }

  /**
   * Opens the first alert on the Alerts List page for the given host name
   * @param hostName
   */
  async openFirstAlertDetailsForHostName(hostName: string): Promise<void> {
    await this.ensureOnAlertsPage();

    let foundAndHandled = false;

    // Get all event rows
    const allEvents = await this.testSubjects.findService.allByCssSelector(
      ALERT_TABLE_ROW_CSS_SELECTOR
    );

    for (const eventRow of allEvents) {
      const hostNameButton = await this.testSubjects.findDescendant(
        'host-details-button',
        eventRow
      );
      const eventRowHostName = (await hostNameButton.getVisibleText()).trim();

      if (eventRowHostName === hostName) {
        const expandAlertButton = await this.testSubjects.findDescendant('expand-event', eventRow);
        await expandAlertButton.click();
        await this.testSubjects.existOrFail('eventDetails');
        foundAndHandled = true;
        break;
      }
    }

    if (!foundAndHandled) {
      throw new Error(`no alerts found for host: ${hostName}`);
    }
  }

  /**
   * Opens the Response console from the alert Details. Alert details must be already opened/displayed
   */
  async openResponseConsoleFromAlertDetails(): Promise<void> {
    await this.testSubjects.existOrFail('eventDetails');
    await this.testSubjects.click('take-action-dropdown-btn');
    await this.testSubjects.clickWhenNotDisabled('endpointResponseActions-action-item');
    await this.testSubjects.existOrFail('consolePageOverlay');
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

  async waitForListToHaveAlerts(timeoutMs?: number): Promise<void> {
    await this.retry.waitForWithTimeout(
      'waiting for alerts to show up on alerts page',
      timeoutMs ?? this.defaultTimeoutMs,
      async (): Promise<boolean> => {
        await this.clickRefresh();

        const allEventRows = await this.testSubjects.findService.allByCssSelector(
          ALERT_TABLE_ROW_CSS_SELECTOR
        );

        return Boolean(allEventRows.length);
      }
    );
  }

  private async navigateToDetectionsPage(path: string = ''): Promise<void> {
    const subUrl = `detections${path ? `/${path}` : ''}`;
    await this.common.navigateToUrl('securitySolution', subUrl, {
      shouldUseHashForSubUrl: false,
    });
  }
}
