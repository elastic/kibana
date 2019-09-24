
import {
  defaultFindTimeout
} from '../index';

import PageObjects from './index';

export default class HeaderPage {

  init(remote) {
    this.remote = remote;
  }

  clickSelector(selector) {
    return PageObjects.common.try(() => {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector(selector)
      .then(tab => {
        return tab.click();
      });
    });
  }

  async clickDiscover() {
    PageObjects.common.debug('click Discover tab');
    await this.clickSelector('button[aria-label="Apps menu"]');
    await this.remote.findByLinkText('Discover').click();
  }

  clickVisualize() {
    PageObjects.common.debug('click Visualize tab');
    this.clickSelector('a[href*=\'visualize\']');
  }

  clickDashboard() {
    PageObjects.common.debug('click Dashboard tab');
    this.clickSelector('a[href*=\'dashboard\']');
  }

  clickSettings() {
    PageObjects.common.debug('click Settings tab');
    this.clickSelector('a[href*=\'settings\']');
  }

  clickTimepicker() {
    return PageObjects.common.try(() => {
      return PageObjects.common.findTestSubject('superDatePickerToggleQuickMenuButton').click();
    });
  }

  clickTimespan(timespan) {
    return PageObjects.common.findTestSubject('superDatePickerCommonlyUsed_' + timespan.split(" ").join("_")).click();
  }

  isTimepickerOpen() {
    return this.remote.findById('QuickSelectPopover').getAttribute('class')
    .then((element) => {
      return element.toString().includes('euiPopover-isOpen');
    });
  }

  async setFromTime(timeString) {
    await PageObjects.common.findTestSubject('superDatePickerstartDatePopoverButton').click();
    await PageObjects.common.findTestSubject('superDatePickerAbsoluteTab').click();
    await PageObjects.common.sleep(200);
    await PageObjects.common.findTestSubject('superDatePickerAbsoluteDateInput').click();
    await PageObjects.common.findTestSubject('superDatePickerAbsoluteDateInput')
    .clearValue();
    await PageObjects.common.findTestSubject('superDatePickerAbsoluteDateInput')
    .type(timeString);
  }

  async setToTime(timeString) {
    await PageObjects.common.findTestSubject('superDatePickerendDatePopoverButton').click();
    await PageObjects.common.sleep(2000);
    await PageObjects.common.findTestSubject('superDatePickerAbsoluteTab').click();
    await PageObjects.common.sleep(200);
    await PageObjects.common.findTestSubject('superDatePickerAbsoluteDateInput').click();
    await PageObjects.common.findTestSubject('superDatePickerAbsoluteDateInput')
    .clearValue();
    await PageObjects.common.findTestSubject('superDatePickerAbsoluteDateInput')
    .type(timeString);
  }


  async setFromRelativeTime(count, unit) {
  	await PageObjects.common.findTestSubject('superDatePickerstartDatePopoverButton').click();
    await PageObjects.common.sleep(50);
    await PageObjects.common.findTestSubject('superDatePickerRelativeTab').click();
    await PageObjects.common.sleep(51);
    await PageObjects.common.findTestSubject('superDatePickerRelativeDateInputNumber').click();
    await PageObjects.common.sleep(51);
    await PageObjects.common.findTestSubject('superDatePickerRelativeDateInputNumber').clearValue();
    await PageObjects.common.findTestSubject('superDatePickerRelativeDateInputNumber').type(count);
    await PageObjects.common.sleep(52);
    await PageObjects.common.findTestSubject('superDatePickerRelativeDateInputUnitSelector').click();
    await PageObjects.common.sleep(53);
    await this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector(`select[data-test-subj="superDatePickerRelativeDateInputUnitSelector"] option[value="${unit}"]`)
      .click();
      await PageObjects.common.findTestSubject('superDatePickerstartDatePopoverButton').click();
  }

  async setToRelativeTime(count, unit) {
    await PageObjects.common.sleep(53);
    await PageObjects.common.findTestSubject('superDatePickerendDatePopoverButton').click();
    await PageObjects.common.sleep(54);
    await PageObjects.common.findTestSubject('superDatePickerRelativeTab').click();
    await PageObjects.common.sleep(55);
    await PageObjects.common.findTestSubject('superDatePickerRelativeDateInputNumber').click();
    await PageObjects.common.sleep(51);
    await PageObjects.common.findTestSubject('superDatePickerRelativeDateInputNumber').clearValue();
    await PageObjects.common.findTestSubject('superDatePickerRelativeDateInputNumber').type(count);
    await PageObjects.common.sleep(56);
    await PageObjects.common.findTestSubject('superDatePickerRelativeDateInputUnitSelector').click();
    await PageObjects.common.sleep(57);
    await this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector(`select[data-test-subj="superDatePickerRelativeDateInputUnitSelector"] option[value="${unit}"]`)
      .click();
      await PageObjects.common.findTestSubject('superDatePickerendDatePopoverButton').click();
  }

  clickGoButton() {
    const self = this;
    //return PageObjects.common.findTestSubject('superDatePickerApplyTimeButton')
	   return self.remote.setFindTimeout(defaultFindTimeout).findByCssSelector('.euiSuperUpdateButton')
    .click()
    .then(function () {
      return self.getSpinnerDone();
    });
  }


  getTimepickerMode() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('.kbn-timepicker-modes > button[aria-selected="true"]')
    .getAttribute('ng-class')
    .then((mode) => {
      PageObjects.common.debug('Timepicker mode = ' + mode.toString());
      return mode;
    });
  }


  setQuickSpan(timespan) {
    return PageObjects.common.sleep(2000)
    .then(() => {
      return this.isTimepickerOpen()
      .then ((open) => {
        if (!open) {
          PageObjects.common.debug('We didn\'t find the timepicker open so clickTimepicker');
          return this.clickTimepicker()
          .then(() => {
            return PageObjects.common.sleep(1000);
          });
        }
      });
    })
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(() => {
      PageObjects.common.debug('--Select time span : ' + timespan);
      return this.clickTimespan(timespan);
    })
    .then(() => {
      return this.getSpinnerDone();
    });
  }

  async setAbsoluteRange(fromTime, toTime) {
    await PageObjects.common.sleep(2000);
    await PageObjects.common.findTestSubject('superDatePickerShowDatesButton').click();
    await PageObjects.common.debug('--Setting From Time : ' + fromTime);
    await this.setFromTime(fromTime);
    await PageObjects.common.debug('--Setting To Time : ' + toTime);
    await this.setToTime(toTime);
    await this.clickGoButton();
    await this.getSpinnerDone();

  }

  async setRelativeRange(fromCount, fromUnit, toCount, toUnit) {
    await PageObjects.common.sleep(2000);
    await PageObjects.common.findTestSubject('superDatePickerShowDatesButton').click();
    await PageObjects.common.sleep(2000);
    await PageObjects.common.debug(`--Setting From Time : ${fromCount} ${fromUnit}`);
    await this.setFromRelativeTime(fromCount, fromUnit);
    await PageObjects.common.sleep(200);
    await PageObjects.common.findTestSubject('superDatePickerShowDatesButton').click();
    await PageObjects.common.sleep(200);
    await PageObjects.common.debug(`--Setting To Time : ${toCount} ${toUnit}`);
    await this.setToRelativeTime(toCount, toUnit);
    await PageObjects.common.findTestSubject('querySubmitButton').click();
    return await this.getSpinnerDone();
  }


  collapseTimepicker() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('.fa.fa-chevron-circle-up')
    .click();
  }

  getToastMessage() {
    return this.remote.setFindTimeout(defaultFindTimeout * 2)
    .findDisplayedByCssSelector('kbn-truncated.toast-message')
    .getVisibleText();
  }

  waitForToastMessageGone() {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .waitForDeletedByCssSelector('kbn-truncated.toast-message');
  }

  clickToastOK() {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('div.toaster-container button:nth-child(1)')
    .click();
  }

  getSpinnerDone() {
    return this.remote.setFindTimeout(defaultFindTimeout * 10)
    .findByCssSelector('[data-test-subj="globalLoadingIndicator-hidden"]');
  }

  clickReporting() {
    return PageObjects.common.findTestSubject('shareTopNavButton')
    .click();
  }

  clickPrintablePdf() {
    return PageObjects.common.findTestSubject('sharePanel-PDFReports')
    .click();
  }

}
