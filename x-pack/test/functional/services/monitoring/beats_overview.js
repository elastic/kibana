/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringBeatsOverviewProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const SUBJ_OVERVIEW_PAGE = 'beatsOverviewPage';

  const SUBJ_NO_RECENT_ACTIVITY_MESSAGE = 'noRecentActivityMessage';

  return new (class BeatsOverview {
    async isOnOverview() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_OVERVIEW_PAGE));
      return pageId !== null;
    }

    noRecentActivityMessageIsShowing() {
      return testSubjects.exists(SUBJ_NO_RECENT_ACTIVITY_MESSAGE);
    }
  })();
}
