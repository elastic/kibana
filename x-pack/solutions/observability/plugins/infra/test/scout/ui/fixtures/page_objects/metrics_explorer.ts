/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { EXTENDED_TIMEOUT } from '../constants';

/**
 * Metrics Explorer page (`/app/metrics/explorer`). Encapsulates the metric and "graph per"
 * combo boxes, the chart grid, and the chart-style customization popover — replacing the FTR
 * `infraMetricsExplorer` page object. Metrics Explorer is a deprecated, stateful-only feature,
 * so this page object is only exercised by the stateful `metrics_explorer.spec.ts`.
 */
export class MetricsExplorerPage {
  public readonly metricsComboBox: Locator;
  public readonly charts: Locator;
  public readonly missingMetricMessage: Locator;
  public readonly customizeButton: Locator;
  public readonly maxMetricsReachedMessage: Locator;
  // The selected metrics render as combo-box pills; their count is the number of plotted metrics.
  public readonly selectedMetricPills: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.metricsComboBox = this.page.getByTestId('metricsExplorer-metrics');
    this.charts = this.page.getByTestId('metricsExplorer-chart');
    this.missingMetricMessage = this.page.getByTestId('metricsExplorer-missingMetricMessage');
    this.customizeButton = this.page.getByTestId('metricsExplorer-customize');
    // When the metric limit is hit the combo box replaces its options with a single disabled
    // "max reached" option, which renders in a portal outside the combo box DOM.
    this.maxMetricsReachedMessage = this.page.getByTestId('infraMetricsExplorerMaxMetricsReached');
    this.selectedMetricPills = this.metricsComboBox.getByTestId('euiComboBoxPill');
  }

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('metrics')}/explorer`);
    await this.metricsComboBox.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  /**
   * Sets the absolute time range on the toolbar's `EuiSuperDatePicker`. The shared `datePicker`
   * page object can't drive it because it applies via the query-bar submit button, which Metrics
   * Explorer's search bar does not render. The toolbar hosts the only date picker on the page (the
   * search bar's is disabled), so the page-level superDatePicker subjects are safe. Mirrors the
   * shared `DatePicker` legacy helper: sets the end bound first, then the start bound, then applies.
   */
  async setTimeRange(from: string, to: string) {
    const showDatesButton = this.page.getByTestId('superDatePickerShowDatesButton');
    if (await showDatesButton.isVisible().catch(() => false)) {
      await showDatesButton.click();
    }

    await this.commitAbsoluteDate('end', to);
    await this.commitAbsoluteDate('start', from);

    // The picker keeps the committed dates pending until its own update button is clicked, which
    // fires `onTimeChange` and refetches the charts (there is no query-bar submit button here).
    await this.page.getByTestId('superDatePickerApplyTimeButton').click();
  }

  private async commitAbsoluteDate(edge: 'start' | 'end', value: string) {
    await this.page.getByTestId(`superDatePicker${edge}DatePopoverButton`).click();
    await this.openAbsoluteTab();

    const input = this.page.getByTestId('superDatePickerAbsoluteDateInput');
    await input.clear();
    await input.pressSequentially(value);
    await input.press('Enter');
    // Close the popover so the next edge's popover button isn't overlaid by this one.
    await this.page.keyboard.press('Escape');
  }

  private async openAbsoluteTab() {
    // Two elements can match: the tab visible in the freshly opened popover and a stale/hidden one
    // left in the DOM. Target the visible one so the click doesn't race a detaching node.
    const absoluteTab = this.page
      .getByTestId('superDatePickerAbsoluteTab')
      .filter({ visible: true });
    await expect(absoluteTab).toHaveCount(1);
    await absoluteTab.click();
  }

  async addMetric(field: string) {
    const searchInput = this.metricsComboBox.getByTestId('comboBoxSearchInput');
    await searchInput.click();
    await searchInput.fill(field);
    // The option label is the raw field name; match it exactly so prefix-sharing fields
    // (e.g. `system.core.total.pct` vs `system.core.total.norm.pct`) don't collide.
    await this.page.getByRole('option', { name: field, exact: true }).click();
  }

  async removeMetric(field: string) {
    await this.metricsComboBox
      .locator(`[title="Remove ${field} from selection in this group"]`)
      .click();
  }

  async clearMetrics() {
    await this.metricsComboBox.getByTestId('comboBoxClearButton').click();
  }

  async setGroupBy(field: string) {
    // The "Graph per" combo uses EUI's default option rendering, so the option's accessible name
    // carries screen-reader "highlight" markers and several fields share the `host.name` substring.
    // Scout's combo-box helper type-filters and keyboard-selects the exact match, sidestepping both
    // (unlike the metric combo box, whose custom `renderOption` yields a clean, exact-matchable name).
    await this.page.components.comboBox('metricsExplorer-groupBy').setSelectedOptions([field]);
  }

  /**
   * Opens the metric combo box so the "maximum metrics reached" option surfaces once the
   * selection limit is hit.
   */
  async openMetricOptions() {
    await this.metricsComboBox.getByTestId('comboBoxSearchInput').click();
  }

  /**
   * Reads the chart style ("area chart" / "bar chart") of the first rendered chart. elastic-charts
   * exposes it in a screen-reader-only `<figure>` (e.g. `Chart type: area chart`) that is hidden by
   * design — so wait for it to be attached (never `visible`) and read its text content, mirroring
   * how the FTR suite derived the chart type from the chart's accessibility summary.
   */
  async getFirstChartDescription(): Promise<string> {
    await expect(this.charts).not.toHaveCount(0, { timeout: EXTENDED_TIMEOUT });
    const [firstChart] = await this.charts.all();
    const figure = firstChart.locator('figure');
    await figure.waitFor({ state: 'attached', timeout: EXTENDED_TIMEOUT });

    return (await figure.textContent())?.toLowerCase() ?? '';
  }

  async switchChartType(type: 'line' | 'area' | 'bar') {
    await this.customizeButton.click();
    await this.page
      .getByTestId(`metricsExplorer-chartRadio-${type}`)
      .locator(`label[for="${type}"]`)
      .click();
    // Toggle the popover shut so it doesn't overlay the chart grid we assert on next.
    await this.customizeButton.click();
  }
}
