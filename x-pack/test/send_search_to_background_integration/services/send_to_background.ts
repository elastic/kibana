/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

const SEND_TO_BACKGROUND_TEST_SUBJ = 'searchSessionIndicator';
const SEND_TO_BACKGROUND_POPOVER_CONTENT_TEST_SUBJ = 'searchSessionIndicatorPopoverContainer';

type SessionStateType =
  | 'none'
  | 'loading'
  | 'completed'
  | 'backgroundLoading'
  | 'backgroundCompleted'
  | 'restored'
  | 'canceled';

export function SendToBackgroundProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');

  return new (class SendToBackgroundService {
    public async find(): Promise<WebElementWrapper> {
      return testSubjects.find(SEND_TO_BACKGROUND_TEST_SUBJ);
    }

    public async exists(): Promise<boolean> {
      return testSubjects.exists(SEND_TO_BACKGROUND_TEST_SUBJ);
    }

    public async expectState(state: SessionStateType) {
      return retry.waitFor(`sendToBackground indicator to get into state = ${state}`, async () => {
        const currentState = await (
          await testSubjects.find(SEND_TO_BACKGROUND_TEST_SUBJ)
        ).getAttribute('data-state');
        return currentState === state;
      });
    }

    public async viewSearchSessions() {
      await this.ensurePopoverOpened();
      await testSubjects.click('searchSessionIndicatorviewSearchSessionsLink');
    }

    public async save() {
      await this.ensurePopoverOpened();
      await testSubjects.click('searchSessionIndicatorSaveBtn');
      await this.ensurePopoverClosed();
    }

    public async cancel() {
      await this.ensurePopoverOpened();
      await testSubjects.click('searchSessionIndicatorCancelBtn');
      await this.ensurePopoverClosed();
    }

    public async refresh() {
      await this.ensurePopoverOpened();
      await testSubjects.click('searchSessionIndicatorRefreshBtn');
      await this.ensurePopoverClosed();
    }

    private async ensurePopoverOpened() {
      const isAlreadyOpen = await testSubjects.exists(SEND_TO_BACKGROUND_POPOVER_CONTENT_TEST_SUBJ);
      if (isAlreadyOpen) return;
      return retry.waitFor(`sendToBackground popover opened`, async () => {
        await testSubjects.click(SEND_TO_BACKGROUND_TEST_SUBJ);
        return await testSubjects.exists(SEND_TO_BACKGROUND_POPOVER_CONTENT_TEST_SUBJ);
      });
    }

    private async ensurePopoverClosed() {
      const isAlreadyClosed = !(await testSubjects.exists(
        SEND_TO_BACKGROUND_POPOVER_CONTENT_TEST_SUBJ
      ));
      if (isAlreadyClosed) return;
      return retry.waitFor(`sendToBackground popover closed`, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        return !(await testSubjects.exists(SEND_TO_BACKGROUND_POPOVER_CONTENT_TEST_SUBJ));
      });
    }
  })();
}
