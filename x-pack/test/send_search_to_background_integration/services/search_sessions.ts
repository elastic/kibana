/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObjectsFindResponse } from 'src/core/server';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

const SEARCH_SESSION_INDICATOR_TEST_SUBJ = 'searchSessionIndicator';
const SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ = 'searchSessionIndicatorPopoverContainer';

export const TOUR_TAKING_TOO_LONG_STEP_KEY = `data.searchSession.tour.takingTooLong`;
export const TOUR_RESTORE_STEP_KEY = `data.searchSession.tour.restore`;

type SessionStateType =
  | 'none'
  | 'loading'
  | 'completed'
  | 'backgroundLoading'
  | 'backgroundCompleted'
  | 'restored'
  | 'canceled';

export function SearchSessionsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const supertest = getService('supertest');

  return new (class SendToBackgroundService {
    public async find(): Promise<WebElementWrapper> {
      return testSubjects.find(SEARCH_SESSION_INDICATOR_TEST_SUBJ);
    }

    public async exists(): Promise<boolean> {
      return testSubjects.exists(SEARCH_SESSION_INDICATOR_TEST_SUBJ);
    }

    public async missingOrFail(): Promise<void> {
      return testSubjects.missingOrFail(SEARCH_SESSION_INDICATOR_TEST_SUBJ);
    }

    public async disabledOrFail() {
      await this.exists();
      await expect(await (await this.find()).getAttribute('data-save-disabled')).to.be('true');
    }

    public async expectState(state: SessionStateType) {
      return retry.waitFor(`searchSessions indicator to get into state = ${state}`, async () => {
        const currentState = await (
          await testSubjects.find(SEARCH_SESSION_INDICATOR_TEST_SUBJ)
        ).getAttribute('data-state');
        return currentState === state;
      });
    }

    public async viewSearchSessions() {
      log.debug('viewSearchSessions');
      await this.ensurePopoverOpened();
      await testSubjects.click('searchSessionIndicatorViewSearchSessionsLink');
    }

    public async save() {
      log.debug('save the search session');
      await this.ensurePopoverOpened();
      await testSubjects.click('searchSessionIndicatorSaveBtn');
      await this.ensurePopoverClosed();
    }

    public async cancel() {
      log.debug('cancel the search session');
      await this.ensurePopoverOpened();
      await testSubjects.click('searchSessionIndicatorCancelBtn');
      await this.ensurePopoverClosed();
    }

    public async openPopover() {
      await this.ensurePopoverOpened();
    }

    public async openedOrFail() {
      return testSubjects.existOrFail(SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ, {
        timeout: 15000, // because popover auto opens after search takes 10s
      });
    }

    public async closedOrFail() {
      return testSubjects.missingOrFail(SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ, {
        timeout: 15000, // because popover auto opens after search takes 10s
      });
    }

    private async ensurePopoverOpened() {
      log.debug('ensurePopoverOpened');
      const isAlreadyOpen = await testSubjects.exists(SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ);
      if (isAlreadyOpen) {
        log.debug('Popover is already open');
        return;
      }
      return retry.waitFor(`searchSessions popover opened`, async () => {
        await testSubjects.click(SEARCH_SESSION_INDICATOR_TEST_SUBJ);
        return await testSubjects.exists(SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ);
      });
    }

    private async ensurePopoverClosed() {
      log.debug('ensurePopoverClosed');
      const isAlreadyClosed = !(await testSubjects.exists(
        SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ
      ));
      if (isAlreadyClosed) return;
      return retry.waitFor(`searchSessions popover closed`, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        return !(await testSubjects.exists(SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ));
      });
    }

    /*
     * This cleanup function should be used by tests that create new search sessions.
     * Tests should not end with new search sessions remaining in storage since that interferes with functional tests that check the _find API.
     * Alternatively, a test can navigate to `Management > Search Sessions` and use the UI to delete any created tests.
     */
    public async deleteAllSearchSessions() {
      log.debug('Deleting created search sessions');
      // ignores 409 errs and keeps retrying
      await retry.tryForTime(10000, async () => {
        const { body } = await supertest
          .post('/internal/session/_find')
          .set('kbn-xsrf', 'anything')
          .set('kbn-system-request', 'true')
          .send({ page: 1, perPage: 10000, sortField: 'created', sortOrder: 'asc' })
          .expect(200);

        const { saved_objects: savedObjects } = body as SavedObjectsFindResponse;
        log.debug(`Found created search sessions: ${savedObjects.map(({ id }) => id)}`);
        await Promise.all(
          savedObjects.map(async (so) => {
            log.debug(`Deleting search session: ${so.id}`);
            await supertest
              .delete(`/internal/session/${so.id}`)
              .set(`kbn-xsrf`, `anything`)
              .expect(200);
          })
        );
      });
    }

    public async markTourDone() {
      await Promise.all([
        browser.setLocalStorageItem(TOUR_TAKING_TOO_LONG_STEP_KEY, 'true'),
        browser.setLocalStorageItem(TOUR_RESTORE_STEP_KEY, 'true'),
      ]);
    }

    public async markTourUndone() {
      await Promise.all([
        browser.removeLocalStorageItem(TOUR_TAKING_TOO_LONG_STEP_KEY),
        browser.removeLocalStorageItem(TOUR_RESTORE_STEP_KEY),
      ]);
    }
  })();
}
