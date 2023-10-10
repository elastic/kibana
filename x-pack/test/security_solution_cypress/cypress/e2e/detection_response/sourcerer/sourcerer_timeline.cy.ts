/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ALERTS_INDEX,
  DEFAULT_INDEX_PATTERN,
} from '@kbn/security-solution-plugin/common/constants';

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import { TIMELINES_URL } from '../../../urls/navigation';
import {
  clickAlertCheckbox,
  deselectSourcererOptions,
  isDataViewSelection,
  isKibanaDataViewOption,
  isNotSourcererOption,
  isNotSourcererSelection,
  isSourcererOptions,
  isSourcererSelection,
  openAdvancedSettings,
  openDataViewSelection,
  openSourcerer,
  refreshUntilAlertsIndexExists,
  resetSourcerer,
  saveSourcerer,
} from '../../../tasks/sourcerer';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { SOURCERER } from '../../../screens/sourcerer';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { getTimeline, getTimelineModifiedSourcerer } from '../../../objects/timeline';
import { closeTimeline, openTimelineById } from '../../../tasks/timeline';

const siemDataViewTitle = 'Security Default Data View';
const dataViews = ['auditbeat-*,fakebeat-*', 'auditbeat-*,*beat*,siem-read*,.kibana*,fakebeat-*'];

// TODO: https://github.com/elastic/kibana/issues/161539
describe.skip('Timeline scope', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    login();
    visitWithTimeRange(TIMELINES_URL);
  });

  it('correctly loads SIEM data view', () => {
    openTimelineUsingToggle();
    openSourcerer('timeline');
    isDataViewSelection(siemDataViewTitle);
    openAdvancedSettings();
    isSourcererSelection(`auditbeat-*`);
    isSourcererSelection(`${DEFAULT_ALERTS_INDEX}-default`);
    isSourcererOptions(DEFAULT_INDEX_PATTERN.filter((pattern) => pattern !== 'auditbeat-*'));
    isNotSourcererOption(`${DEFAULT_ALERTS_INDEX}-default`);
  });

  describe('Modified badge', () => {
    it('Selecting new data view does not add a modified badge', () => {
      openTimelineUsingToggle();
      cy.get(SOURCERER.badgeModified).should(`not.exist`);
      openSourcerer('timeline');
      cy.get(SOURCERER.badgeModifiedOption).should(`not.exist`);
      openDataViewSelection();
      isKibanaDataViewOption(dataViews);
      cy.get(SOURCERER.selectListDefaultOption).should(`contain`, siemDataViewTitle);
      cy.get(SOURCERER.selectListOption).contains(dataViews[1]).click();
      isDataViewSelection(dataViews[1]);
      saveSourcerer();
      cy.get(SOURCERER.badgeModified).should(`not.exist`);
      openSourcerer('timeline');
      cy.get(SOURCERER.badgeModifiedOption).should(`not.exist`);
    });

    it('shows modified badge when index patterns change and removes when reset', () => {
      openTimelineUsingToggle();
      openSourcerer('timeline');
      openDataViewSelection();
      cy.get(SOURCERER.selectListOption).contains(dataViews[1]).click();
      isDataViewSelection(dataViews[1]);
      openAdvancedSettings();
      const patterns = dataViews[1].split(',');
      deselectSourcererOptions([patterns[0]]);
      saveSourcerer();
      cy.get(SOURCERER.badgeModified).should(`exist`);
      openSourcerer('timeline');
      cy.get(SOURCERER.badgeModifiedOption).should(`exist`);
      resetSourcerer();
      saveSourcerer();
      cy.get(SOURCERER.badgeModified).should(`not.exist`);
      openSourcerer('timeline');
      cy.get(SOURCERER.badgeModifiedOption).should(`not.exist`);
      isDataViewSelection(siemDataViewTitle);
    });
  });
  describe('Alerts checkbox', () => {
    before(() => {
      login();
      createTimeline(getTimeline()).then((response) =>
        cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('timelineId')
      );
      createTimeline(getTimelineModifiedSourcerer()).then((response) =>
        cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('auditbeatTimelineId')
      );
    });

    beforeEach(() => {
      login();
      visitWithTimeRange(TIMELINES_URL);
      refreshUntilAlertsIndexExists();
    });

    it('Modifies timeline to alerts only, and switches to different saved timeline without issue', function () {
      openTimelineById(this.timelineId).then(() => {
        cy.get(SOURCERER.badgeAlerts).should(`not.exist`);
        cy.get(SOURCERER.badgeModified).should(`not.exist`);
        openSourcerer('timeline');
        clickAlertCheckbox();
        saveSourcerer();
        cy.get(SOURCERER.badgeAlerts).should(`exist`);
        cy.get(SOURCERER.badgeModified).should(`not.exist`);
        closeTimeline();

        openTimelineById(this.auditbeatTimelineId).then(() => {
          cy.get(SOURCERER.badgeModified).should(`exist`);
          cy.get(SOURCERER.badgeAlerts).should(`not.exist`);
          openSourcerer('timeline');
          openAdvancedSettings();
          isSourcererSelection(`auditbeat-*`);
        });
      });
    });

    const defaultPatterns = [`auditbeat-*`, `${DEFAULT_ALERTS_INDEX}-default`];
    it('alerts checkbox behaves as expected', () => {
      isDataViewSelection(siemDataViewTitle);
      defaultPatterns.forEach((pattern) => isSourcererSelection(pattern));
      openDataViewSelection();
      cy.get(SOURCERER.selectListOption).contains(dataViews[1]).click();
      isDataViewSelection(dataViews[1]);
      dataViews[1]
        .split(',')
        .filter((pattern) => pattern !== 'fakebeat-*' && pattern !== 'siem-read*')
        .forEach((pattern) => isSourcererSelection(pattern));

      clickAlertCheckbox();
      isNotSourcererSelection(`auditbeat-*`);
      isSourcererSelection(`${DEFAULT_ALERTS_INDEX}-default`);
      cy.get(SOURCERER.alertCheckbox).uncheck({ force: true });
      defaultPatterns.forEach((pattern) => isSourcererSelection(pattern));
    });

    it('shows alerts badge when index patterns change and removes when reset', () => {
      clickAlertCheckbox();
      saveSourcerer();
      cy.get(SOURCERER.badgeAlerts).should(`exist`);
      openSourcerer('timeline');
      cy.get(SOURCERER.badgeAlertsOption).should(`exist`);
      resetSourcerer();
      saveSourcerer();
      cy.get(SOURCERER.badgeAlerts).should(`not.exist`);
      openSourcerer('timeline');
      cy.get(SOURCERER.badgeAlertsOption).should(`not.exist`);
    });
  });
});
