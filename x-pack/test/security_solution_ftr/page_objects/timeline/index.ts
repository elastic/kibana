/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import { DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP } from '@kbn/security-solution-plugin/common/test';
import { FtrService } from '../../../functional/ftr_provider_context';

const TIMELINE_BOTTOM_BAR_CONTAINER_TEST_SUBJ = 'timeline-bottom-bar';
const TIMELINE_CLOSE_BUTTON_TEST_SUBJ = 'timeline-modal-header-close-button';
const TIMELINE_MODAL_PAGE_TEST_SUBJ = 'timeline';
const TIMELINE_TAB_QUERY_TEST_SUBJ = 'timeline-tab-content-query';

const TIMELINE_CSS_SELECTOR = Object.freeze({
  bottomBarTimelineTitle: `${testSubjSelector(
    TIMELINE_BOTTOM_BAR_CONTAINER_TEST_SUBJ
  )} ${testSubjSelector('timeline-bottom-bar-title-button')}`,
  /** The refresh button on the timeline view (top of view, next to the date selector) */
  refreshButton: `${testSubjSelector(TIMELINE_TAB_QUERY_TEST_SUBJ)} ${testSubjSelector(
    'superDatePickerApplyTimeButton'
  )} `,
});

export class TimelinePageObject extends FtrService {
  private readonly pageObjects = this.ctx.getPageObjects(['common', 'header']);
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly defaultTimeoutMs = this.ctx.getService('config').get('timeouts.waitFor');
  private readonly logger = this.ctx.getService('log');

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

  async openTimelineFromBottomBar() {
    await this.ensureTimelineAccessible();
    await this.testSubjects.findService.clickByCssSelector(
      TIMELINE_CSS_SELECTOR.bottomBarTimelineTitle
    );
  }

  async openTimelineById(id: string): Promise<void> {
    await this.openTimelineFromBottomBar();
    await this.testSubjects.click('timeline-bottom-bar-open-timeline');
    await this.testSubjects.findService.clickByCssSelector(
      `${testSubjSelector('open-timeline-modal')} ${testSubjSelector(`timeline-title-${id}`)}`
    );

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
    await this.testSubjects.findService.clickByCssSelector(
      `${testSubjSelector('event')}:nth-child(${index + 1}) ${testSubjSelector('expand-event')}`
    );
    await this.testSubjects.existOrFail('eventDetails');
  }

  /**
   * Clicks the Refresh button at the top of the timeline page and waits for the refresh to complete
   */
  async clickRefresh(): Promise<void> {
    await this.ensureTimelineIsOpen();
    await this.pageObjects.header.waitUntilLoadingHasFinished();
    await (
      await this.testSubjects.findService.byCssSelector(TIMELINE_CSS_SELECTOR.refreshButton)
    ).isEnabled();
    await this.testSubjects.findService.clickByCssSelector(TIMELINE_CSS_SELECTOR.refreshButton);
    await this.retry.waitFor(
      'Timeline refresh button to be enabled',
      async (): Promise<boolean> => {
        return (
          await this.testSubjects.findService.byCssSelector(TIMELINE_CSS_SELECTOR.refreshButton)
        ).isEnabled();
      }
    );
  }

  /**
   * Check to see if the timeline has events in the list
   */
  async hasEvents(): Promise<boolean> {
    const eventRows = await this.testSubjects.findService.allByCssSelector(
      `${testSubjSelector(TIMELINE_MODAL_PAGE_TEST_SUBJ)} ${testSubjSelector('event')}`
    );

    return eventRows.length > 0;
  }

  /**
   * Waits for events to be displayed in the timeline. It will click on the "Refresh" button to trigger a data fetch
   * @param timeoutMs
   */
  async waitForEvents(timeoutMs?: number): Promise<void> {
    if (await this.hasEvents()) {
      this.logger.info(`Timeline already has events displayed`);
      return;
    }

    await this.retry.waitForWithTimeout(
      'waiting for events to show up on timeline',
      timeoutMs ?? this.defaultTimeoutMs,
      async (): Promise<boolean> => {
        await this.clickRefresh();

        return this.hasEvents();
      }
    );
  }

  /**
   * Sets the date range on the timeline by clicking on a commonly used preset from the super date picker
   * @param range
   */
  async setDateRange(range: keyof typeof DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP): Promise<void> {
    await this.ensureTimelineIsOpen();
    await this.testSubjects.findService.clickByCssSelector(
      `${testSubjSelector(TIMELINE_TAB_QUERY_TEST_SUBJ)} ${testSubjSelector(
        'superDatePickerToggleQuickMenuButton'
      )}`
    );
    await this.testSubjects.existOrFail('superDatePickerQuickMenu');
    await this.testSubjects.click(DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP[range]);
    await this.testSubjects.missingOrFail('superDatePickerQuickMenu');
  }
}
