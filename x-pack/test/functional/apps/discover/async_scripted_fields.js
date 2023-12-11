/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tests for scripted field in default distribution where async search is used
import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  // const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'settings',
    'discover',
    'timePicker',
    'header',
    'dashboard',
  ]);
  const queryBar = getService('queryBar');
  const security = getService('security');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('search with scripted fields', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/kibana_scripted_fields_on_logstash'
      );
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await security.testUser.setRoles(['test_logstash_reader', 'global_discover_read']);
      // changing the timepicker default here saves us from having to set it in Discover (~8s)
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults':
          '{  "from": "Sep 18, 2015 @ 19:37:13.000",  "to": "Sep 23, 2015 @ 02:30:09.000"}',
      });
    });

    after(async function afterAll() {
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.uiSettings.update({});
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.restoreDefaults();
    });

    it('query should show incomplete results callout', async function () {
      if (false) {
        /* If you had to modify the scripted fields, you could un-comment all this, run it, use es_archiver to update 'kibana_scripted_fields_on_logstash'
         */
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.createIndexPattern('logsta');
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings.addScriptedField(
          'sharedFail',
          'painless',
          'string',
          null,
          '1',
          // Scripted field below with multiple string checking actually should cause share failure message
          // bcause it's not checking if all the fields it uses exist in each doc (and they don't)
          "if (doc['response.raw'].value == '200') { return 'good ' + doc['url.raw'].value } else { return 'bad ' + doc['machine.os.raw'].value } "
        );
      }

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('logsta*');

      await retry.try(async function () {
        await testSubjects.existOrFail('searchResponseWarningsEmptyPrompt');
      });
    });

    it('query should show incomplete results badge on dashboard', async function () {
      await security.testUser.setRoles([
        'test_logstash_reader',
        'global_discover_all',
        'global_dashboard_all',
      ]);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('logsta*');

      await PageObjects.discover.saveSearch('search with warning');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();

      await dashboardAddPanel.addSavedSearch('search with warning');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async function () {
        await testSubjects.existOrFail('searchResponseWarningsBadgeToogleButton');
      });
    });

    it('query return results with valid scripted field', async function () {
      if (false) {
        /* the skipped steps below were used to create the scripted fields in the logstash-* index pattern
        which are now saved in the esArchive.
         */

        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings.addScriptedField(
          'goodScript',
          'painless',
          'string',
          null,
          '1',
          // Scripted field below with should work
          "if (doc['response.raw'].value == '200') { if (doc['url.raw'].size() > 0) { return 'good ' + doc['url.raw'].value } else { return 'good' } } else { if (doc['machine.os.raw'].size() > 0) { return 'bad ' + doc['machine.os.raw'].value } else { return 'bad' } }"
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(
            startingCount + 1
          );
        });

        await PageObjects.settings.addScriptedField(
          'goodScript2',
          'painless',
          'string',
          null,
          '1',
          // Scripted field below which should work
          "if (doc['url.raw'].size() > 0) { String tempString = \"\"; for ( int i = (doc['url.raw'].value.length() - 1); i >= 0 ; i--) { tempString = tempString + (doc['url.raw'].value).charAt(i); } return tempString; } else { return \"emptyUrl\"; }"
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(
            startingCount + 2
          );
        });
      }

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('logstash-*');
      await queryBar.setQuery('php* OR *jpg OR *css*');
      await testSubjects.click('querySubmitButton');
      await retry.tryForTime(30000, async function () {
        expect(await PageObjects.discover.getHitCount()).to.be('13,301');
      });
    });
  });
}
