/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';

const SEND_TO_BACKGROUND_TEST_SUBJ = 'backgroundSessionIndicator';
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
      throw new Error('TODO');
    }

    public async save() {
      throw new Error('TODO');
    }

    public async cancel() {
      throw new Error('TODO');
    }

    public async refresh() {
      throw new Error('TODO');
    }
  })();
}
