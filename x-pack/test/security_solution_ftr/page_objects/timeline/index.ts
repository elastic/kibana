/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../../../functional/ftr_provider_context';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';
import { DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP } from '../helpers/super_date_picker';

const TIMELINE_BOTTOM_BAR_CONTAINER_TEST_SUBJ = 'timeline-bottom-bar-container';
const TIMELINE_CLOSE_BUTTON_TEST_SUBJ = 'close-timeline';
const TIMELINE_MODAL_PAGE_TEST_SUBJ = 'timeline';

export class TimelinePageObject extends FtrService {
  private readonly pageObjects = this.ctx.getPageObjects(['common', 'header']);
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly defaultTimeoutMs = this.ctx.getService('config').get('timeouts.waitFor');

  async navigateToTimelineList(): Promise<void> {
    await this.pageObjects.common.navigateToUrlWithBrowserHistory('securitySolutionTimelines');
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  /**
   * Ensure that the timeline bottom bar is accessible
   */
  async ensureTimelineAccessible(): Promise<void> {
    await this.testSubjects.existOrFail(TIMELINE_BOTTOM_BAR_CONTAINER_TEST_SUBJ);
  }

  async findTimelineBottomBarAddButton(): Promise<WebElementWrapper> {
    await this.ensureTimelineAccessible();
    return this.testSubjects.findDescendant(
      'settings-plus-in-circle',
      await this.testSubjects.find(TIMELINE_BOTTOM_BAR_CONTAINER_TEST_SUBJ)
    );
  }

  async showOpenTimelinePopupFromBottomBar(): Promise<void> {
    await this.ensureTimelineAccessible();
    await (await this.findTimelineBottomBarAddButton()).click();
    await this.testSubjects.existOrFail('timeline-addPopupPanel');
  }

  async openTimelineById(id: string): Promise<void> {
    await this.showOpenTimelinePopupFromBottomBar();
    await this.testSubjects.click('open-timeline-button');

    const timelineSelectModel = await this.testSubjects.find('open-timeline-modal');

    await (await this.testSubjects.findDescendant(`title-${id}`, timelineSelectModel)).click();
    await this.ensureTimelineIsOpen();
  }

  async closeTimeline(): Promise<void> {
    if (await this.testSubjects.exists(TIMELINE_CLOSE_BUTTON_TEST_SUBJ)) {
      await this.testSubjects.click(TIMELINE_CLOSE_BUTTON_TEST_SUBJ);
      await this.testSubjects.waitForHidden(TIMELINE_MODAL_PAGE_TEST_SUBJ);
    }
  }

  async ensureTimelineIsOpen(): Promise<void> {
    await this.testSubjects.existOrFail(TIMELINE_MODAL_PAGE_TEST_SUBJ);
  }

  /**
   * From a visible timeline, clicks the "view details" for an event on the list
   * @param index
   */
  async showEventDetails(index: number = 0): Promise<void> {
    await this.ensureTimelineIsOpen();

    const event = (await this.testSubjects.findAll('event'))[index];

    if (!event) {
      throw new Error(`Timeline event at index [${index}] not found`);
    }

    await (await this.testSubjects.findDescendant('expand-event', event)).click();
    await this.testSubjects.existOrFail('eventDetails');
  }

  /**
   * Clicks the Refresh button at the top of the timeline page and waits for the refresh to complete
   */
  async clickRefresh(): Promise<void> {
    await this.ensureTimelineIsOpen();

    // There are multiple buttons on the page with the same test subject as the Refresh button.
    // We specifically want the one that is always visible at the top of timeline page.
    const timelineContentQueryArea = await this.testSubjects.find('timeline-tab-content-query');
    const refreshButton = await this.testSubjects.findDescendant(
      'superDatePickerApplyTimeButton',
      timelineContentQueryArea
    );
    await refreshButton.click();

    await this.retry.waitFor(
      'Timeline refresh button to be enabled',
      async (): Promise<boolean> => {
        return refreshButton.isEnabled();
      }
    );
  }

  /**
   * Waits for events to be displayed in the timeline. It will click on the "Refresh" button to trigger a data fetch
   * @param timeoutMs
   */
  async waitForEvents(timeoutMs?: number): Promise<void> {
    const timeline = await this.testSubjects.find(TIMELINE_MODAL_PAGE_TEST_SUBJ);

    await this.retry.waitForWithTimeout(
      'waiting for events to show up on timeline',
      timeoutMs ?? this.defaultTimeoutMs,
      async (): Promise<boolean> => {
        await this.clickRefresh();

        return Boolean((await this.testSubjects.findAllDescendant('event', timeline)).length);
      }
    );
  }

  /**
   * Sets the date range on the timeline by clicking on a commonly used preset from the super date picker
   * @param range
   */
  async setDateRange(range: keyof typeof DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP): Promise<void> {
    await this.ensureTimelineIsOpen();

    const timelineContentQueryArea = await this.testSubjects.find('timeline-tab-content-query');

    await (
      await this.testSubjects.findDescendant(
        'superDatePickerToggleQuickMenuButton',
        timelineContentQueryArea
      )
    ).click();

    await this.testSubjects.existOrFail('superDatePickerQuickMenu');
    await this.testSubjects.click(DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP[range]);
    await this.testSubjects.missingOrFail('superDatePickerQuickMenu');
  }
}
