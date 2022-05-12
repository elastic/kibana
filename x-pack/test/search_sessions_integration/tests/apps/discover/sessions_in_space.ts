/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'discover',
    'visChart',
    'security',
    'timePicker',
    'searchSessionsManagement',
  ]);
  const browser = getService('browser');
  const searchSessions = getService('searchSessions');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');

  describe('discover in space', () => {
    describe('Storing search sessions in space', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/dashboard/session_in_space');

        await kibanaServer.uiSettings.replace(
          {
            'timepicker:timeDefaults':
              '{  "from": "2015-09-01T00:00:00.000Z",  "to": "2015-10-01T00:00:00.000Z"}',
            defaultIndex: 'd1bd6c84-d9d0-56fb-8a72-63fe60020920',
          },
          { space: 'another-space' }
        );

        await security.role.create('data_analyst', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['all'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['all'],
              },
              spaces: ['another-space'],
            },
          ],
        });

        await security.user.create('analyst', {
          password: 'analyst-password',
          roles: ['data_analyst'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login('analyst', 'analyst-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();

        await security.role.delete('data_analyst');
        await security.user.delete('analyst');

        await kibanaServer.uiSettings.unset('timepicker:timeDefaults', { space: 'another-space' });
        await kibanaServer.uiSettings.unset('defaultIndex', { space: 'another-space' });
        await esArchiver.unload('x-pack/test/functional/es_archives/dashboard/session_in_space');
      });

      it('Saves and restores a session', async () => {
        await PageObjects.common.navigateToApp('discover', { basePath: 's/another-space' });

        await PageObjects.discover.selectIndexPattern('logstash-*');

        await PageObjects.discover.waitForDocTableLoadingComplete();

        await searchSessions.expectState('completed');
        await searchSessions.save();
        await searchSessions.expectState('backgroundCompleted');
        await inspector.open();

        const savedSessionId = await (
          await testSubjects.find('inspectorRequestSearchSessionId')
        ).getAttribute('data-search-session-id');
        await inspector.close();

        await searchSessions.openPopover();
        await searchSessions.viewSearchSessions();

        // purge client side search cache
        // https://github.com/elastic/kibana/issues/106074#issuecomment-920462094
        await browser.refresh();

        const searchSessionList = await PageObjects.searchSessionsManagement.getList();
        const searchSessionItem = searchSessionList.find(
          (session) => session.id === savedSessionId
        );

        if (!searchSessionItem) throw new Error(`Can\'t find session with id = ${savedSessionId}`);

        // navigate to discover
        await searchSessionItem.view();

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitForDocTableLoadingComplete();

        // Check that session is restored
        await searchSessions.expectState('restored');
        await testSubjects.missingOrFail('discoverNoResultsError');
        expect(await toasts.getToastCount()).to.be(0); // no session restoration related warnings
      });
    });
    describe('Disabled storing search sessions in space', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/dashboard/session_in_space');

        await kibanaServer.uiSettings.replace(
          {
            'timepicker:timeDefaults':
              '{  "from": "2015-09-01T00:00:00.000Z",  "to": "2015-10-01T00:00:00.000Z"}',
            defaultIndex: 'd1bd6c84-d9d0-56fb-8a72-63fe60020920',
          },
          { space: 'another-space' }
        );

        await security.role.create('data_analyst', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['all'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['read'],
              },
              spaces: ['another-space'],
            },
          ],
        });

        await security.user.create('analyst', {
          password: 'analyst-password',
          roles: ['data_analyst'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login('analyst', 'analyst-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();

        await security.role.delete('data_analyst');
        await security.user.delete('analyst');

        await kibanaServer.uiSettings.unset('timepicker:timeDefaults', { space: 'another-space' });
        await kibanaServer.uiSettings.unset('defaultIndex', { space: 'another-space' });
        await esArchiver.unload('x-pack/test/functional/es_archives/dashboard/session_in_space');
      });

      it("Doesn't allow to store a session", async () => {
        await PageObjects.common.navigateToApp('discover', { basePath: 's/another-space' });

        await PageObjects.discover.selectIndexPattern('logstash-*');

        await PageObjects.timePicker.setAbsoluteRange(
          'Sep 1, 2015 @ 00:00:00.000',
          'Oct 1, 2015 @ 00:00:00.000'
        );

        await PageObjects.discover.waitForDocTableLoadingComplete();

        await searchSessions.expectState('completed');
        await searchSessions.disabledOrFail();
      });
    });
  });
}
