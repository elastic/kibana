/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  const PageObjects = getPageObjects(['common', 'settings', 'discover', 'timePicker']);
  const queryBar = getService('queryBar');
  const security = getService('security');

  describe('async search with scripted fields', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await esArchiver.load('kibana_scripted_fields_on_logstash');
      await esArchiver.loadIfNeeded('logstash_functional');
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
      await esArchiver.unload('logstash_functional');
      await esArchiver.load('empty_kibana');
      await security.testUser.restoreDefaults();
    });

    it('query should show failed shards pop up', async function () {
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

      await retry.tryForTime(20000, async function () {
        // wait for shards failed message
        const shardMessage = await testSubjects.getVisibleText('euiToastHeader');
        log.debug(shardMessage);
        expect(shardMessage).to.be('1 of 3 shards failed');
      });
    });

    it('query return results with valid scripted field', async function () {
      if (false) {
        /* the commented-out steps below were used to create the scripted fields in the logstash-* index pattern
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

      await PageObjects.discover.selectIndexPattern('logstash-*');
      await queryBar.setQuery('php* OR *jpg OR *css*');
      await testSubjects.click('querySubmitButton');
      await retry.tryForTime(30000, async function () {
        expect(await PageObjects.discover.getHitCount()).to.be('13,301');
      });
    });
  });
}
