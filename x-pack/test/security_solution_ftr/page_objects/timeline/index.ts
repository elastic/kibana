/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../../../functional/ftr_provider_context';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';

const TIMELINE_BOTTOM_BAR_CONTAINER_TEST_SUBJ = 'timeline-bottom-bar-container';
const TIMELINE_CLOSE_BUTTON_TEST_SUBJ = 'close-timeline';
const TIMELINE_MODAL_PAGE_TEST_SUBJ = 'timeline';

export class TimelinePageObject extends FtrService {
  private readonly pageObjects = this.ctx.getPageObjects(['common', 'header']);
  private readonly testSubjects = this.ctx.getService('testSubjects');

  async navigateToTimelineList(): Promise<void> {
    await this.pageObjects.common.navigateToUrlWithBrowserHistory('securitySolutionTimelines');
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

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
    await this.testSubjects.existOrFail(TIMELINE_MODAL_PAGE_TEST_SUBJ);
  }

  async closeTimeline(): Promise<void> {
    if (await this.testSubjects.exists(TIMELINE_CLOSE_BUTTON_TEST_SUBJ)) {
      await this.testSubjects.click(TIMELINE_CLOSE_BUTTON_TEST_SUBJ);
      await this.testSubjects.waitForHidden(TIMELINE_MODAL_PAGE_TEST_SUBJ);
    }
  }
}
