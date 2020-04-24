/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Tests for scripted field in default distribution where async search is used
import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  // const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'settings', 'discover', 'timePicker']);
  const queryBar = getService('queryBar');

  describe('async search with scripted fields', function() {
    this.tags(['skipFirefox']);

    before(async function() {
      await esArchiver.load('kibana_scripted_fields_on_logstash'); // TODO, save a new .kibana index with the index pattern with scripted field already there
      await esArchiver.loadIfNeeded('logstash_functional');

      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      // await PageObjects.settings.createIndexPattern();
      await kibanaServer.uiSettings.update({});
    });

    after(async function afterAll() {
      // await esArchiver.unload('logstash_functional');
    });

    // it('query should show failed shards pop up', async function() {
    //   await PageObjects.settings.navigateTo();
    //   await PageObjects.settings.clickKibanaIndexPatterns();
    //   await PageObjects.settings.clickIndexPatternLogstash();
    //   const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
    //   await PageObjects.settings.clickScriptedFieldsTab();
    //   await log.debug('add scripted field');
    //   await PageObjects.settings.addScriptedField(
    //     'sharedFail',
    //     'painless',
    //     'string',
    //     null,
    //     '1',
    //     // "'test'" << trivial static string passes on 7.7.0 BC8
    //     // Scripted field below with multiple string checking actually should cause share failure message but just gets "no results" message
    //     "if (doc['response.raw'].value == '200') { if (doc['url.raw'].value != null) { return 'good ' + doc['url.raw'].value } else { return 'good' } } else { if (doc['machine.os.raw'].value != null) { return 'bad ' + doc['machine.os.raw'].value } else { return 'bad' } }"
    //   );
    //   await retry.try(async function() {
    //     expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(
    //       startingCount + 1
    //     );
    //   });

    //   const fromTime = 'Sep 19, 2015 @ 19:37:13.000';
    //   const toTime = 'Sep 23, 2015 @ 02:30:09.000';
    //   await PageObjects.common.navigateToApp('discover');
    //   await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

    //   await retry.tryForTime(20000, async function() {
    //     expect(await PageObjects.discover.getHitCount()).to.be('14,005');
    //   });
    // });

    it('query return results with valid scripted field', async function() {
      // await PageObjects.settings.navigateTo();
      // await PageObjects.settings.clickKibanaIndexPatterns();
      // await PageObjects.settings.clickIndexPatternLogstash();
      // const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
      // await PageObjects.settings.clickScriptedFieldsTab();
      // await log.debug('add scripted field');
      // await PageObjects.settings.addScriptedField(
      //   'goodScript',
      //   'painless',
      //   'string',
      //   null,
      //   '1',
      //   // "'test'" << trivial static string passes on 7.7.0 BC8
      //   // Scripted field below with should work
      //   "if (doc['response.raw'].value == '200') { if (doc['url.raw'].size() > 0) { return 'good ' + doc['url.raw'].value } else { return 'good' } } else { if (doc['machine.os.raw'].size() > 0) { return 'bad ' + doc['machine.os.raw'].value } else { return 'bad' } }"
      // );
      // await retry.try(async function() {
      //   expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(
      //     startingCount + 1
      //   );
      // });

      // await PageObjects.settings.addScriptedField(
      //   'goodScript2',
      //   'painless',
      //   'string',
      //   null,
      //   '1',
      //   // "'test'" << trivial static string passes on 7.7.0 BC8
      //   // Scripted field below with should work
      //   "if (doc['url.raw'].size() > 0) { String tempString = \"\"; for ( int i = (doc['url.raw'].value.length() - 1); i >= 0 ; i--) { tempString = tempString + (doc['url.raw'].value).charAt(i); } return tempString; } else { return \"emptyUrl\"; }"
      // );
      // await retry.try(async function() {
      //   expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(
      //     startingCount + 2
      //   );
      // });

      const fromTime = 'Sep 19, 2015 @ 19:37:13.000';
      const toTime = 'Sep 23, 2015 @ 02:30:09.000';
      await PageObjects.common.navigateToApp('discover');
      await queryBar.setQuery('php* OR *jpg OR *css*');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await retry.tryForTime(30000, async function() {
        expect(await PageObjects.discover.getHitCount()).to.be('13,301');
      });
    });
  });
}
