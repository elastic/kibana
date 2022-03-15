/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import uuid from 'uuid/v4';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common',
  'header',
  'dashboard',
  'visChart',
  'searchSessionsManagement',]);
  const a11y = getService('a11y');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  //const toasts = getService('toasts');
  const searchSessions = getService('searchSessions');
  const kibanaServer = getService('kibanaServer');
const log = getService('log');

  describe('Search sessions a11y tests', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.load('x-pack/test/functional/es_archives/dashboard/async_search');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await kibanaServer.uiSettings.replace({ 'search:timeout': 10000 });
      await PageObjects.common.navigateToApp('dashboard');
      log.debug('wait for dashboard landing page');
      await retry.tryForTime(10000, async () => {
        testSubjects.existOrFail('dashboardLandingPage');
      });
      await searchSessions.markTourDone();
      log.debug('loading the "Not Delayed" dashboard');
      await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
      await PageObjects.dashboard.waitForRenderComplete();
      await searchSessions.expectState('completed');
      const searchSessionName = `Session - ${uuid()}`;
      await searchSessions.save({ searchSessionName });
      await searchSessions.expectState('backgroundCompleted');
      await PageObjects.searchSessionsManagement.goTo();
    });

    // after(async () => {
    //   await searchSessions.deleteAllSearchSessions();
    // });

    it('Search sessions page meets a11y requirements', async () => {
      await a11y.testAppSnapshot();
    });


  });
}
