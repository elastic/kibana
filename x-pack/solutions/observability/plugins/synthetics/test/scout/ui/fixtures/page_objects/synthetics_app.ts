/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KibanaUrl, Locator } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

enum FormMonitorType {
  SINGLE = 'single',
  MULTISTEP = 'multistep',
  HTTP = 'http',
  TCP = 'tcp',
  ICMP = 'icmp',
}

export type { FormMonitorType };

export class SyntheticsAppPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async navigateToMonitorManagement() {
    await this.page.goto(this.kbnUrl.get('/app/synthetics/monitors'));
    await this.waitForMonitorManagementLoadingToFinish();
  }

  async navigateToOverview(refreshInterval?: number) {
    const url = refreshInterval
      ? `/app/synthetics?refreshInterval=${refreshInterval}`
      : '/app/synthetics';
    await this.page.goto(this.kbnUrl.get(url));
  }

  async navigateToSettings() {
    await this.page.goto(this.kbnUrl.get('/app/synthetics/settings'));
    await this.page.testSubj.waitForSelector('createConnectorButton');
    // await this.page.waitForSelector('h1:has-text("Settings")');
  }

  async navigateToAddMonitor() {
    await this.page.goto(this.kbnUrl.get('/app/synthetics/add-monitor'));
    await this.page.testSubj.waitForSelector('syntheticsMonitorConfigName');
    // await this.waitForLoadingToFinish();
  }

  async navigateToStepDetails({
    configId,
    stepIndex,
    checkGroup,
  }: {
    checkGroup: string;
    configId: string;
    stepIndex: number;
  }) {
    const stepDetailsPath = `/app/synthetics/monitor/${configId}/test-run/${checkGroup}/step/${stepIndex}?locationId=us_central`;
    await this.page.goto(this.kbnUrl.get(stepDetailsPath));
  }

  async waitForMonitorManagementLoadingToFinish() {
    await expect(this.page.testSubj.locator('uptimeLoader')).toBeHidden({ timeout: 60_000 });
  }

  async waitForLoadingToFinish() {
    await expect(this.page.testSubj.locator('kbnLoadingMessage')).toBeHidden({ timeout: 30_000 });
  }

  async ensureIsOnMonitorConfigPage() {
    await expect(this.page.testSubj.locator('syntheticsMonitorConfigSubmitButton')).toBeVisible({
      timeout: 30_000,
    });
  }

  async confirmAndSave(isUpdate = false) {
    await this.ensureIsOnMonitorConfigPage();
    await this.page.testSubj.click('syntheticsMonitorConfigSubmitButton');
    const msg = isUpdate ? 'Monitor updated successfully.' : 'Monitor added successfully.';
    await expect(this.page.getByText(msg)).toBeVisible({ timeout: 60_000 });
    await this.page.testSubj.locator('toastCloseButton').click({ timeout: 20_000 });
  }

  async selectMonitorType(monitorType: string) {
    await this.page.testSubj.click(monitorType);
  }

  async selectLocationsAddEdit({ locations }: { locations: string[] }) {
    for (const loc of locations) {
      await this.page.testSubj.click('syntheticsMonitorConfigLocations');
      await this.page.click(`text=${loc}`);
    }
  }

  async selectFrequencyAddEdit({ value, unit }: { value: number; unit: string }) {
    await this.page.testSubj.click('syntheticsMonitorConfigSchedule');
    const optionLocator = this.page.locator(`text=Every ${value} ${unit}`);
    await optionLocator.evaluate((element: HTMLOptionElement) => {
      if (element?.parentElement) {
        (element.parentElement as HTMLSelectElement).selectedIndex = element.index;
      }
    });
  }

  async fillFirstMonitorDetails({ url, locations }: { url: string; locations: string[] }) {
    await this.page.testSubj.fill('urls-input', url);
    await this.page.testSubj.click('comboBoxInput');
    for (const loc of locations) {
      await this.page.testSubj.click(`syntheticsServiceLocation--${loc}`);
    }
    await this.page.testSubj.click('urls-input');
  }

  async createBasicMonitorDetails({
    name,
    apmServiceName,
    locations,
  }: {
    name: string;
    apmServiceName: string;
    locations: string[];
  }) {
    await this.page.click('text="Advanced options"');
    await this.page.testSubj.fill('syntheticsMonitorConfigName', name);
    await this.page.testSubj.fill('syntheticsMonitorConfigAPMServiceName', apmServiceName);
    await this.selectLocationsAddEdit({ locations });
  }

  async createBasicHTTPMonitorDetails({
    name,
    url,
    apmServiceName,
    locations,
  }: {
    name: string;
    url: string;
    apmServiceName: string;
    locations: string[];
  }) {
    await this.selectMonitorType('syntheticsMonitorTypeHTTP');
    await this.createBasicMonitorDetails({ name, apmServiceName, locations });
    await this.page.testSubj.fill('syntheticsMonitorConfigURL', url);
  }

  async createBasicTCPMonitorDetails({
    name,
    host,
    apmServiceName,
    locations,
  }: {
    name: string;
    host: string;
    apmServiceName: string;
    locations: string[];
  }) {
    await this.selectMonitorType('syntheticsMonitorTypeTCP');
    await this.createBasicMonitorDetails({ name, apmServiceName, locations });
    await this.page.testSubj.fill('syntheticsMonitorConfigHost', host);
  }

  async createBasicICMPMonitorDetails({
    name,
    host,
    apmServiceName,
    locations,
  }: {
    name: string;
    host: string;
    apmServiceName: string;
    locations: string[];
  }) {
    await this.selectMonitorType('syntheticsMonitorTypeICMP');
    await this.createBasicMonitorDetails({ name, apmServiceName, locations });
    await this.page.testSubj.fill('syntheticsMonitorConfigHost', host);
  }

  async createBasicBrowserMonitorDetails({
    name,
    inlineScript,
    recorderScript,
    apmServiceName,
    locations,
  }: {
    name: string;
    inlineScript?: string;
    recorderScript?: string;
    apmServiceName: string;
    locations: string[];
  }) {
    await this.createBasicMonitorDetails({ name, apmServiceName, locations });
    if (inlineScript) {
      await this.page.testSubj.click('syntheticsSourceTab__inline');
      await this.page.fill('[data-test-subj=codeEditorContainer] textarea', inlineScript);
      return;
    }
    if (recorderScript) {
      await this.page.setInputFiles('input[data-test-subj=syntheticsFleetScriptRecorderUploader]', {
        name: 'file.js',
        mimeType: 'text/javascript',
        buffer: Buffer.from(recorderScript),
      });
    }
  }

  async createMonitor({
    monitorConfig,
    monitorType,
  }: {
    monitorConfig: Record<string, string | string[]>;
    monitorType: FormMonitorType;
  }) {
    switch (monitorType) {
      case FormMonitorType.HTTP:
        await this.createBasicHTTPMonitorDetails(monitorConfig as any);
        break;
      case FormMonitorType.TCP:
        await this.createBasicTCPMonitorDetails(monitorConfig as any);
        break;
      case FormMonitorType.ICMP:
        await this.createBasicICMPMonitorDetails(monitorConfig as any);
        break;
      case FormMonitorType.MULTISTEP:
        await this.createBasicBrowserMonitorDetails(monitorConfig as any);
        break;
      default:
        break;
    }
  }

  async enableMonitorManagement(shouldEnable = true) {
    const addMonitorBtn = this.page.getByRole('button', { name: 'Create monitor' });
    const isDisabled = await addMonitorBtn.isDisabled().catch(() => true);
    const isEnabled = !isDisabled;
    if (isEnabled === shouldEnable) {
      return;
    }
    const toggle = this.page.testSubj.locator('syntheticsEnableSwitch');
    const button = this.page.testSubj.locator('syntheticsEnableButton');
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
    } else if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
      await button.click();
    }
  }

  async deleteMonitors() {
    if (!this.page.url().includes('monitors/management')) {
      return;
    }
    await this.page.testSubj.locator('euiCollapsedItemActionsButton').first().click();
    await this.page.click(`.euiContextMenuPanel [data-test-subj="syntheticsMonitorDeleteAction"]`, {
      delay: 800,
    });
    await expect(this.page.testSubj.locator('confirmModalTitleText')).toBeVisible();
    await this.page.testSubj.click('confirmModalConfirmButton');
    await this.page.testSubj.click('uptimeDeleteMonitorSuccess');
    await this.page.testSubj.click('syntheticsRefreshButtonButton');
    await this.page.testSubj.click('checkboxSelectAll');
    await this.page.testSubj.click('syntheticsBulkOperationPopoverClickMeToLoadAContextMenuButton');
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  async navigateToEditMonitor(monitorName: string) {
    const monitorRow = this.page.locator(
      `.euiTableRowCell:has([data-test-subj="syntheticsMonitorDetailsLinkLink"]:has-text("${monitorName}"))`
    );
    await expect(monitorRow).toBeVisible();
    await monitorRow.scrollIntoViewIfNeeded();
    monitorRow.locator('data-test-subj="euiCollapsedItemActionsButton"').click();
    await this.page.testSubj.click('syntheticsMonitorEditAction');
  }

  async adjustRows() {
    await this.page.testSubj.click('tablePaginationPopoverButton');
    await this.page.click('text="100 rows"');
  }

  async findMonitorConfiguration(monitorConfig: Record<string, string>) {
    // for (const value of Object.values(monitorConfig)) {
    //   await expect(this.page.getByText(value, { exact: true }).first()).toBeVisible({
    //     timeout: 30_000,
    //   });
    // }
  }

  async findEditMonitorConfiguration(monitorEditDetails: Array<[string, string]>) {
    await this.page.click('text="Advanced options"');
    for (const [selector, expected] of monitorEditDetails) {
      if (selector.includes('codeEditorContainer')) {
        await expect(this.page.locator(selector)).toHaveText(expected);
      } else {
        await expect(this.page.locator(selector)).toHaveValue(expected);
      }
    }
  }

  async goToRulesPage() {
    await this.page.goto(this.kbnUrl.get('/app/observability/alerts/rules'));
  }

  isEuiFormFieldInValid(locator: Locator): Promise<boolean> {
    return locator.evaluate((el: HTMLElement) => {
      const classAttribute = el.getAttribute('class') ?? '';
      const isAriaInvalid = el.getAttribute('aria-invalid') ?? 'false';
      return classAttribute.indexOf('-isInvalid') > -1 || isAriaInvalid === 'true';
    });
  }
}
