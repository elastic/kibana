/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse } from 'src/core/server';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

const SEND_TO_BACKGROUND_TEST_SUBJ = 'backgroundSessionIndicator';
const SEND_TO_BACKGROUND_POPOVER_CONTENT_TEST_SUBJ = 'backgroundSessionIndicatorPopoverContainer';

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
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const supertest = getService('supertest');

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

    public async viewBackgroundSessions() {
      await this.ensurePopoverOpened();
      await testSubjects.click('backgroundSessionIndicatorViewBackgroundSessionsLink');
    }

    public async save() {
      await this.ensurePopoverOpened();
      await testSubjects.click('backgroundSessionIndicatorSaveBtn');
      await this.ensurePopoverClosed();
    }

    public async cancel() {
      await this.ensurePopoverOpened();
      await testSubjects.click('backgroundSessionIndicatorCancelBtn');
      await this.ensurePopoverClosed();
    }

    public async refresh() {
      await this.ensurePopoverOpened();
      await testSubjects.click('backgroundSessionIndicatorRefreshBtn');
      await this.ensurePopoverClosed();
    }

    public async openPopover() {
      await this.ensurePopoverOpened();
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

    /*
     * This cleanup function should be used by tests that create new background sesions.
     * Tests should not end with new background sessions remaining in storage since that interferes with functional tests that check the _find API.
     * Alternatively, a test can navigate to `Managment > Background Sessions` and use the UI to delete any created tests.
     */
    public async deleteAllBackgroundSessions() {
      log.debug('Deleting created background sessions');
      // ignores 409 errs and keeps retrying
      await retry.tryForTime(5000, async () => {
        const { body } = await supertest
          .post('/internal/session/_find')
          .set('kbn-xsrf', 'anything')
          .set('kbn-system-request', 'true')
          .send({ page: 1, perPage: 10000, sortField: 'created', sortOrder: 'asc' })
          .expect(200);

        const { saved_objects: savedObjects } = body as SavedObjectsFindResponse;
        log.debug(`Found created background sessions: ${savedObjects.map(({ id }) => id)}`);
        await Promise.all(
          savedObjects.map(async (so) => {
            log.debug(`Deleting background session: ${so.id}`);
            await supertest
              .delete(`/internal/session/${so.id}`)
              .set(`kbn-xsrf`, `anything`)
              .expect(200);
          })
        );
      });
    }
  })();
}
