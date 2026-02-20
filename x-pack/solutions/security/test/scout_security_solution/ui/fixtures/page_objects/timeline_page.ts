/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const TIMELINES_URL = '/app/security/timelines/default';

export class TimelinePage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.goto(TIMELINES_URL);
  }

  async gotoWithTimeRange() {
    const timerange =
      'timerange=(global:(linkTo:!(timeline),timerange:(from:1547914976217,fromStr:2019-01-19T16:22:56.217Z,kind:relative,to:1579537385745,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1547914976217,fromStr:2019-01-19T16:22:56.217Z,kind:relative,to:1579537385745,toStr:now)))';
    await this.page.goto(`${TIMELINES_URL}?${timerange}`);
  }

  get timelinesTable() {
    return this.page.testSubj.locator('timelines-table');
  }

  get newTimelineAction() {
    return this.page.testSubj.locator('timeline-modal-new-timeline').first();
  }

  get createNewTimeline() {
    return this.page.testSubj.locator('timeline-modal-new-timeline');
  }

  get timelineBottomBarToggle() {
    return this.page.testSubj.locator('timeline-bottom-bar-open-button');
  }

  get timelineFlyoutWrapper() {
    return this.page.testSubj.locator('timeline-portal-ref');
  }

  get timelineQuery() {
    return this.page.testSubj.locator('timelineQueryInput');
  }

  get timelinePanel() {
    return this.page.testSubj.locator('timeline-modal-header-panel');
  }

  get saveTimelineBtn() {
    return this.page.testSubj.locator('timeline-modal-save-timeline').first();
  }

  get timelineTitleInput() {
    return this.page.testSubj.locator('save-timeline-modal-title-input');
  }

  get timelineDescriptionInput() {
    return this.page.testSubj.locator('save-timeline-modal-description-input');
  }

  get saveTimelineModalSaveBtn() {
    return this.page.testSubj.locator('save-timeline-modal-save-button');
  }

  get closeTimelineBtn() {
    return this.page.testSubj.locator('timeline-modal-header-close-button');
  }

  get queryTabButton() {
    return this.page.testSubj.locator('timelineTabs-query');
  }

  get addFilterBtn() {
    return this.page.testSubj.locator('addFilter');
  }

  get searchOrFilterContainer() {
    return this.page.testSubj.locator('timeline-select-search-or-filter');
  }

  get dataProvidersContainer() {
    return this.page.testSubj.locator('dataProviders');
  }

  get toggleDataProviderBtn() {
    return this.page.testSubj.locator('toggle-data-provider');
  }

  get fullScreenButton() {
    return this.page.testSubj.locator('full-screen-active');
  }

  get inspectButton() {
    return this.page.testSubj.locator('timeline-container').locator('inspect-empty-button');
  }

  get timelinesTabTemplate() {
    return this.page.testSubj.locator('timeline-tab-template');
  }

  timelineTitleById(id: string) {
    return this.page.testSubj.locator(`timeline-title-${id}`);
  }

  get refreshButton() {
    return this.page.testSubj.locator('refreshButton-linkIcon');
  }

  get openTimelineModal() {
    return this.page.testSubj.locator('open-timeline-modal');
  }

  get bottomBarCreateNewTimeline() {
    return this.page.testSubj.locator('timeline-bottom-bar-new-timeline');
  }

  get bottomBarCreateNewTimelineTemplate() {
    return this.page.testSubj.locator('timeline-bottom-bar-new-timeline-template');
  }

  get loadingIndicator() {
    return this.page.testSubj.locator('loadingIndicator');
  }

  get rows() {
    return this.page.locator('.euiTableRow');
  }

  get timelineStatus() {
    return this.page.testSubj.locator('timeline-save-status');
  }

  get saveTimelineTooltip() {
    return this.page.testSubj.locator('timeline-modal-save-timeline-tooltip');
  }

  get saveAsNewSwitch() {
    return this.page.testSubj.locator('save-timeline-modal-save-as-new-switch');
  }

  get collapsedActionBtn() {
    return this.page.testSubj.locator('euiCollapsedItemActionsButton');
  }

  get createFromTemplateBtn() {
    return this.page.testSubj.locator('create-from-template');
  }

  get createTemplateFromTimelineBtn() {
    return this.page.testSubj.locator('create-template-from-timeline');
  }

  get inspectModal() {
    return this.page.testSubj.locator('inspectorPanel');
  }

  timelineCheckbox(id: string) {
    return this.page.testSubj.locator(`checkboxSelectRow-${id}`);
  }

  timelineItemActionBtn(id: string) {
    return this.page.locator(`[id="${id}-actions"]`).first();
  }

  async openTimelineUsingToggle() {
    const toggle = this.timelineBottomBarToggle.first();
    await toggle.click();
    await this.timelineFlyoutWrapper.first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async createNewTimeline() {
    const toggle = this.timelineBottomBarToggle.first();
    await toggle.click();
    await this.page.waitForTimeout(500);
    const createBtn = this.createNewTimeline.first();
    await createBtn.waitFor({ state: 'visible', timeout: 5000 });
    await createBtn.click();
  }

  async addNameAndDescriptionToTimeline(title: string, description: string) {
    await this.saveTimelineBtn.first().click();
    await this.timelineTitleInput.first().fill(title);
    await this.timelineDescriptionInput.first().fill(description);
    await this.saveTimelineModalSaveBtn.first().click();
  }

  async executeTimelineKQL(query: string) {
    const textarea = this.searchOrFilterContainer.locator('textarea').first();
    await textarea.clear();
    await textarea.fill(query + ' ');
    await textarea.press('Enter');
  }

  async executeTimelineSearch(query: string) {
    await this.timelineQuery.first().fill(query + ' ');
    await this.timelineQuery.first().press('Enter');
  }

  async closeTimeline() {
    await this.closeTimelineBtn.first().click();
  }

  async addNameToTimelineAndSave(name: string) {
    await this.saveTimelineBtn.first().click();
    await this.timelineTitleInput.first().waitFor({ state: 'visible', timeout: 5000 });
    await this.timelineTitleInput.first().fill(name);
    await this.timelineTitleInput.first().press('Enter');
    await this.saveTimelineModalSaveBtn.first().click();
  }

  async addNameToTimelineAndSaveAsNew(name: string) {
    await this.saveTimelineBtn.first().click();
    await this.timelineTitleInput.first().waitFor({ state: 'visible', timeout: 5000 });
    await this.timelineTitleInput.first().fill(name);
    await this.saveAsNewSwitch.first().click();
    await this.saveTimelineModalSaveBtn.first().click();
  }

  async openTimelineById(timelineId: string) {
    await this.timelineTitleById(timelineId).first().click();
  }

  async pinFirstEvent() {
    await this.page.testSubj.locator('timeline-pin-event-button').first().click();
  }

  async markAsFavorite() {
    const star = this.page.testSubj.locator('timeline-favorite-empty-star');
    await this.timelinePanel.locator(star).first().click();
  }

  async toggleFullScreen() {
    await this.fullScreenButton.first().click();
  }

  async openInspectButton() {
    await this.inspectButton.first().waitFor({ state: 'visible', timeout: 5000 });
    await this.inspectButton.first().click();
  }

  async createTimelineFromBottomBar() {
    await this.timelineBottomBarToggle.first().click();
    await this.page.waitForTimeout(500);
    const createNewBtn = this.bottomBarCreateNewTimeline.first();
    await createNewBtn.waitFor({ state: 'visible', timeout: 5000 });
    await createNewBtn.click();
  }

  async createTimelineTemplateFromBottomBar() {
    await this.timelineBottomBarToggle.first().click();
    await this.page.waitForTimeout(500);
    const templateBtn = this.bottomBarCreateNewTimelineTemplate.first();
    await templateBtn.waitFor({ state: 'visible', timeout: 5000 });
    await templateBtn.click();
  }

  async refreshTimelinesUntilPresent(timelineId: string) {
    for (let i = 0; i < 10; i++) {
      await this.refreshButton.first().click();
      const row = this.timelineTitleById(timelineId);
      if (await row.first().isVisible()) {
        return;
      }
      await this.page.waitForTimeout(1000);
    }
  }

  async openTimelineFromSettings() {
    await this.page.testSubj.locator('timeline-modal-open-timeline-button').first().click();
  }

  async openTimelineTemplatesTab() {
    await this.timelinesTabTemplate.first().click();
  }

  async expandEventAction() {
    const collapsedBtn = this.collapsedActionBtn.first();
    await collapsedBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await collapsedBtn.click();
  }
}
