import {
  defaultFindTimeout
} from '../index';

import PageObjects from './index';
import expect from 'expect.js';

export default class DiscoverPage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  getQueryField() {
    return this.findTimeout
    .findByCssSelector('input[ng-model=\'state.query\']');
  }

  getQuerySearchButton() {
    return this.findTimeout
    .findByCssSelector('button[aria-label=\'Search\']');
  }

  getTimespanText() {
    return this.findTimeout
    .findByCssSelector('.kibana-nav-options .navbar-timepicker-time-desc pretty-duration')
    .getVisibleText();
  }

  getChartTimespan() {
    return this.findTimeout
    .findByCssSelector('center.small > span:nth-child(1)')
    .getVisibleText();
  }

  saveSearch(searchName) {
    return this.clickSaveSearchButton()
    .then(() => {
      PageObjects.common.debug('--saveSearch button clicked');
      return this.findTimeout.findDisplayedById('SaveSearch')
      .pressKeys(searchName);
    })
    .then(() => {
      PageObjects.common.debug('--find save button');
      return PageObjects.common.findTestSubject('discoverSaveSearchButton').click();
    });
  }

  loadSavedSearch(searchName) {
    return this.clickLoadSavedSearchButton()
    .then(() => {
      this.findTimeout.findByLinkText(searchName).click();
    });
  }

  clickNewSearchButton() {
    return this.findTimeout
    .findByCssSelector('[aria-label="New Search"]')
    .click();
  }

  clickSaveSearchButton() {
    return this.findTimeout
    .findByCssSelector('[aria-label="Save Search"]')
    .click();
  }

  clickLoadSavedSearchButton() {
    return this.findTimeout
    .findDisplayedByCssSelector('[aria-label="Load Saved Search"]')
    .click();
  }




  getCurrentQueryName() {
    return PageObjects.common.findTestSubject('discoverCurrentQuery')
      .getVisibleText();
  }

  getBarChartData() {
    return this.findTimeout
    .findAllByCssSelector('rect[data-label="Count"]')
    .then(function (chartData) {

      function getChartData(chart) {
        return chart
        .getAttribute('height');
      }

      const getChartDataPromises = chartData.map(getChartData);
      return Promise.all(getChartDataPromises);
    })
    .then(function (bars) {
      return bars;
    });
  }

  getChartInterval() {
    return this.findTimeout
    .findByCssSelector('a[ng-click="toggleInterval()"]')
    .getVisibleText()
    .then(intervalText => {
      if (intervalText.length > 0) {
        return intervalText;
      } else {
        return this.findTimeout
        .findByCssSelector('select[ng-model="state.interval"]')
        .getProperty('value') // this gets 'string:d' for Daily
        .then(selectedValue => {
          return this.findTimeout
          .findByCssSelector('option[value="' + selectedValue + '"]')
          .getVisibleText();
        });
      }
    });
  }

  setChartInterval(interval) {
    return this.remote.setFindTimeout(5000)
    .findByCssSelector('a[ng-click="toggleInterval()"]')
    .click()
    .catch(() => {
      // in some cases we have the link above, but after we've made a
      // selection we just have a select list.
    })
    .then(() => {
      return this.findTimeout
      .findByCssSelector('option[label="' + interval + '"]')
      .click();
    });
  }


  getHitCount() {
    return PageObjects.header.getSpinnerDone()
    .then(() => {
      return PageObjects.common.findTestSubject('discoverQueryHits')
      .getVisibleText();
    });
  }

  query(queryString) {
    return this.findTimeout
    .findByCssSelector('input[aria-label="Search input"]')
    .clearValue()
    .type(queryString)
    .then(() => {
      return this.findTimeout
      .findByCssSelector('button[aria-label="Search"]')
      .click();
    });
  }

  getDocHeader() {
    return this.findTimeout
    .findByCssSelector('thead.ng-isolate-scope > tr:nth-child(1)')
    .getVisibleText();
  }

  getDocTableIndex(index) {
    return this.findTimeout
    .findByCssSelector('tr.discover-table-row:nth-child(' + (index) + ')')
    .getVisibleText();
  }

  clickDocSortDown() {
    return this.findTimeout
    .findByCssSelector('.fa-sort-down')
    .click();
  }

  clickDocSortUp() {
    return this.findTimeout
    .findByCssSelector('.fa-sort-up')
    .click();
  }

  getMarks() {
    return this.findTimeout
    .findAllByCssSelector('mark')
    .getVisibleText();
  }

  clickShare() {
    return this.findTimeout
    .findByCssSelector('button[aria-label="Share Search"]')
    .click();
  }

  clickShortenUrl() {
    return this.findTimeout
    .findByCssSelector('button.shorten-button')
    .click();
  }

  clickCopyToClipboard() {
    return this.findTimeout
    .findDisplayedByCssSelector('button.clipboard-button')
    .click();
  }

  getShareCaption() {
    return this.findTimeout
    .findByCssSelector('.vis-share label')
    .getVisibleText();
  }

  getSharedUrl() {
    return this.findTimeout
    .findByCssSelector('.url')
    .getProperty('value');
  }

  getShortenedUrl() {
    return this.findTimeout
    .findByCssSelector('.url')
    .getProperty('value');
  }

  toggleSidebarCollapse() {
    return this.findTimeout.findDisplayedByCssSelector('.sidebar-collapser .chevron-cont')
      .click();
  }

  getSidebarWidth() {
    return this.findTimeout
      .findByClassName('sidebar-list')
      .getProperty('clientWidth');
  }

  hasNoResults() {
    return PageObjects.common.findTestSubject('discoverNoResults')
      .then(() => true)
      .catch(() => false);
  }

  getNoResultsTimepicker() {
    return PageObjects.common.findTestSubject('discoverNoResultsTimefilter');
  }

  hasNoResultsTimepicker() {
    return this
      .getNoResultsTimepicker()
      .then(() => true)
      .catch(() => false);
  }

  async selectIndexPattern(indexPattern) {
    const patterns = await this.getIndexPatterns();
    if (!indexPattern in patterns) {
      PageObjects.common.debug(`************ Didn't find ${indexPattern} available to select`);
    } else {
      await PageObjects.common.sleep(1001);
      await PageObjects.common.tryForTime(20000, async () => {
        await this.findTimeout.findByClassName('index-pattern-selection').click();
        await PageObjects.common.sleep(1002);
        await this.findTimeout.findByClassName('ui-select-search').clearValue().type(indexPattern + '\n');
        await PageObjects.common.sleep(2003);
        const actualPattern = await this.findTimeout.findByClassName('index-pattern-selection').getVisibleText();
        PageObjects.common.debug(`Current Index Pattern is ${actualPattern}`);
        expect(actualPattern).to.eql(indexPattern);
      });
    }
  }

  async getIndexPatterns() {
    await PageObjects.common.sleep(1001);
    await this.findTimeout.findByClassName('index-pattern-selection').click();

    const list = await this.findTimeout.findAllByCssSelector('.ui-select-choices-row > span');
    const indicesList = await Promise.all(list.map(async (index) => {
      return await index.getVisibleText();
    }));

    PageObjects.common.debug('found indices ' + indicesList);
    return indicesList;
  }

  selectItemByVisibleText(selector, text) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector(selector)
    .then(items => {
      PageObjects.common.debug('found items ' + items.length);

      function itemSelector(item) {
        return item
        .getVisibleText()
        .then(itemText => {
          if (itemText === text) {
            item.click();
          }
        });
      }
      const clickMatchingItem = items.map(itemSelector);
      return Promise.all(clickMatchingItem);
    });
  }


}
