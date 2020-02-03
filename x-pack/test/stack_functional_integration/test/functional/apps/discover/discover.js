/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'discover', 'header']);
  const log = getService('log');
  const screenshot = getService('screenshots');
  const retry = getService('retry');
  const browser = getService('browser');

  describe('discover app', function describeIndexTests() {
    before(async () => {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('### discover');
      await PageObjects.common.navigateToApp('discover');
      log.debug('### setAbsoluteRange');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });

    describe('query', function() {
      const queryName1 = 'Query # 1';
      const fromTimeString = 'September 19th 2015, 06:31:44.000';
      const toTimeString = 'September 23rd 2015, 18:31:44.000';

      it('should show correct time range string by timepicker', async () => {
        const expectedTimeRangeString = fromTimeString + ' to ' + toTimeString;
        const actualTimeString = await PageObjects.discover.getTimespanText();
        expect(actualTimeString).to.be(expectedTimeRangeString);
      });

      it('save query should show toast message and display query name', async () => {
        const expectedSavedQueryMessage = 'Discover: Saved Data Source "' + queryName1 + '"';
        await PageObjects.discover.saveSearch(queryName1);
        const toastMessage = await PageObjects.header.getToastMessage();
        await screenshot.take('Discover-save-query-toast');
        expect(toastMessage).to.be(expectedSavedQueryMessage);
        await PageObjects.header.waitForToastMessageGone();
        const actualQueryNameString = await PageObjects.discover.getCurrentQueryName();
        expect(actualQueryNameString).to.be(queryName1);
      });

      it('load query should show query name', async () => {
        await PageObjects.discover.loadSavedSearch(queryName1);
        await PageObjects.common.sleep(3000);
        const actualQueryNameString = await PageObjects.discover.getCurrentQueryName();
        screenshot.take('Discover-load-query');
        expect(actualQueryNameString).to.be(queryName1);
      });

      it('should show the correct hit count', async () => {
        const expectedHitCount = '14,004';
        await retry.try(async () => {
          expect(await PageObjects.discover.getHitCount().to.be(expectedHitCount));
        });
      });

      it('should show the correct bar chart', async () => {
        const expectedBarChartData = [
          '3.237',
          '17.674',
          '64.75',
          '125.737',
          '119.962',
          '65.712',
          '16.449',
          '2.712',
          '3.675',
          '17.674',
          '59.762',
          '119.087',
          '123.812',
          '61.862',
          '15.487',
          '2.362',
          '2.800',
          '15.312',
          '61.862',
          '123.2',
          '118.562',
          '63.524',
          '17.587',
          '2.537',
        ];
        await PageObjects.common.sleep(4000);
        return verifyChartData(expectedBarChartData);
      });

      it('should show correct time range string in chart', async () => {
        const expectedTimeRangeString = `${fromTimeString} - ${toTimeString}`;
        const actualTimeString = await PageObjects.discover.getChartTimespan();
        expect(actualTimeString).to.be(expectedTimeRangeString);
      });

      it('should show correct initial chart interval of 3 hours', async () => {
        const expectedChartInterval = 'by 3 hours';
        expect(await PageObjects.discover.getChartInterval()).to.be(expectedChartInterval);
      });

      it('should show correct data for chart interval Hourly', async () => {
        const chartInterval = 'Hourly';
        const expectedBarChartData = [
          '1.527',
          '2.290',
          '5.599',
          '7.890',
          '13.236',
          '30.290',
          '46.072',
          '55.490',
          '86.8',
          '112',
          '122.181',
          '131.6',
          '132.872',
          '113.527',
          '102.581',
          '81.709',
          '65.672',
          '43.781',
          '24.181',
          '14',
          '9.672',
          '6.109',
          '0.763',
          '1.018',
          '2.800',
          '3.563',
          '4.327',
          '9.672',
          '12.472',
          '29.272',
          '38.690',
          '54.981',
          '80.181',
          '102.327',
          '113.527',
          '130.581',
          '132.363',
          '120.654',
          '107.163',
          '78.145',
          '58.545',
          '43.272',
          '25.199',
          '12.218',
          '7.636',
          '3.818',
          '2.545',
          '0.509',
          '2.036',
          '1.781',
          '4.327',
          '8.654',
          '9.418',
          '26.472',
          '38.945',
          '61.345',
          '79.672',
          '102.836',
          '125.236',
          '130.327',
          '128.036',
          '120.4',
          '96.472',
          '74.581',
          '70.509',
          '39.709',
          '25.199',
          '13.490',
          '12.472',
          '4.072',
          '2.290',
          '1.018',
        ];
        await PageObjects.discover.setChartInterval(chartInterval);
        await PageObjects.common.sleep(4000);
        return verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Daily', async () => {
        const chartInterval = 'Daily';
        const expectedBarChartData = ['133.196', '129.192', '129.724'];
        await PageObjects.discover.setChartInterval(chartInterval);
        await PageObjects.common.sleep(4000);
        return verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Weekly', async () => {
        const chartInterval = 'Weekly';
        const expectedBarChartData = ['66.598', '129.458'];
        await PageObjects.discover.setChartInterval(chartInterval);
        await PageObjects.common.sleep(2000);
        return verifyChartData(expectedBarChartData);
      });

      it('browser back button should show previous interval Daily', async () => {
        const expectedChartInterval = 'Daily';
        const expectedBarChartData = ['133.196', '129.192', '129.724'];
        await browser.goBack();
        await retry.try(async () => {
          expect(await PageObjects.discover.getChartInterval()).to.be(expectedChartInterval);
        });
        return verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Monthly', async () => {
        const chartInterval = 'Monthly';
        const expectedBarChartData = ['122.535'];
        await PageObjects.discover.setChartInterval(chartInterval);
        await PageObjects.common.sleep(2000);
        return verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Yearly', async () => {
        const chartInterval = 'Yearly';
        const expectedBarChartData = ['122.535'];
        await PageObjects.discover.setChartInterval(chartInterval);
        await PageObjects.common.sleep(2000);
        return verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Auto', async () => {
        const chartInterval = 'Auto';
        const expectedBarChartData = [
          '3.237',
          '17.674',
          '64.75',
          '125.737',
          '119.962',
          '65.712',
          '16.449',
          '2.712',
          '3.675',
          '17.674',
          '59.762',
          '119.087',
          '123.812',
          '61.862',
          '15.487',
          '2.362',
          '2.800',
          '15.312',
          '61.862',
          '123.2',
          '118.562',
          '63.524',
          '17.587',
          '2.537',
        ];
        await PageObjects.discover.setChartInterval(chartInterval);
        await PageObjects.common.sleep(4000);
        await verifyChartData(expectedBarChartData);
      });

      it('should show Auto chart interval of 3 hours', async () => {
        const expectedChartInterval = 'by 3 hours';
        expect(await PageObjects.discover.getChartInterval()).to.be(expectedChartInterval);
      });

      it('should not show "no results"', async () => {
        expect(await PageObjects.discover.hasNoResults()).to.be(false);
      });
    });

    describe('query #2, which has an empty time range', function() {
      const fromTime = '1999-06-11 09:22:11.000';
      const toTime = '1999-06-12 11:21:04.000';

      before(async () => {
        log.debug('setAbsoluteRangeForAnotherQuery');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      });

      it('should show "no results"', async () => {
        const visible = await PageObjects.discover.hasNoResults();
        screenshot.take('Discover-no-results');
        expect(visible).to.be(true);
      });

      it('should suggest a new time range is picked', async () => {
        expect(await PageObjects.discover.hasNoResultsTimepicker()).to.be(true);
      });

      it('should open and close the time picker', async () => {
        let i = 0;

        await closeTimepicker(); // close
        await isTimepickerOpen(false).click(); // open
        await isTimepickerOpen(true).click(); // close
        try {
          await isTimepickerOpen(false);
        } catch (e) {
          await PageObjects.common.createErrorHandler(this);
        }
        async function closeTimepicker() {
          if (!(await PageObjects.header.isTimepickerOpen())) return;
          await PageObjects.discover.getNoResultsTimepicker().click(); // close
        }

        async function isTimepickerOpen(expected) {
          const shown = await PageObjects.header.isTimepickerOpen();
          log.debug(`expect (#${++i}) timepicker to be ${peek(expected)} (is ${peek(shown)}).`);
          expect(shown).to.be(expected);
          return PageObjects.discover.getNoResultsTimepicker();
          function peek(state) {
            return state ? 'open' : 'closed';
          }
        }
      });
    });

    async function verifyChartData(expectedBarChartData) {
      await retry.try(async () => {
        const paths = await PageObjects.discover.getBarChartData();
        // the largest bars are over 100 pixels high so this is less than 1% tolerance
        const barHeightTolerance = 1;
        let stringResults = '';
        let hasFailure = false;
        for (let y = 0; y < expectedBarChartData.length; y++) {
          stringResults +=
            y +
            ': expected = ' +
            expectedBarChartData[y] +
            ', actual = ' +
            paths[y] +
            ', Pass = ' +
            (Math.abs(expectedBarChartData[y] - paths[y]) < barHeightTolerance) +
            '\n';
          if (Math.abs(expectedBarChartData[y] - paths[y]) > barHeightTolerance) {
            hasFailure = true;
          }
        }
        if (hasFailure) {
          PageObjects.common.log(stringResults);
          PageObjects.common.log(paths);
        }
        for (let x = 0; x < expectedBarChartData.length; x++) {
          expect(Math.abs(expectedBarChartData[x] - paths[x]) < barHeightTolerance).to.be.ok();
        }
      });
    }
  });
}
