/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOSE_MANAGE_DATA_VIEW_FLYOUT_BUTTON,
  INDEX_PATTERN_INPUT,
} from '../../../screens/data_view';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import { TIMELINES_URL } from '../../../urls/navigation';
import {
  isDataViewSelection,
  openManageDataView,
  openTimelineDataViewPicker,
  selectDataView,
} from '../../../tasks/data_view';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { createTimeline, deleteTimelines } from '../../../tasks/api_calls/timelines';
import { getTimelineModifiedSourcerer } from '../../../objects/timeline';
import { closeTimeline, openTimelineById } from '../../../tasks/timeline';

const siemDataViewTitle = 'Security solution default';
const alertsDataViewTitle = 'Security solution alerts';

describe('Timeline scope', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    login();
    deleteTimelines();
    visitWithTimeRange(TIMELINES_URL);
  });

  it('correctly loads SIEM data view', () => {
    // checks the correct dataView is selected
    openTimelineUsingToggle();
    openTimelineDataViewPicker();
    isDataViewSelection(siemDataViewTitle);

    // checks the correct index patterns
    openManageDataView();
    cy.get(INDEX_PATTERN_INPUT).should(
      'have.value',
      '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*'
    );
  });

  describe('Alerts checkbox', () => {
    beforeEach(() => {
      createTimeline().then((response) => cy.wrap(response.body.savedObjectId).as('timelineId'));
      createTimeline(getTimelineModifiedSourcerer()).then((response) =>
        cy.wrap(response.body.savedObjectId).as('auditbeatTimelineId')
      );
      visitWithTimeRange(TIMELINES_URL);
    });

    it('Modifies timeline to alerts only, and switches to different saved timeline without issue', function () {
      openTimelineById(this.timelineId).then(() => {
        // checks the correct dataView is selected
        openTimelineDataViewPicker();
        isDataViewSelection(siemDataViewTitle);

        // select alerts dataView
        selectDataView(alertsDataViewTitle);

        // checks the correct index patterns
        openTimelineDataViewPicker();
        openManageDataView();
        cy.get(INDEX_PATTERN_INPUT).should('have.value', '.alerts-security.alerts-default');

        cy.get(CLOSE_MANAGE_DATA_VIEW_FLYOUT_BUTTON).click();
        closeTimeline();

        // verifies different timeline is not impacted by previous timeline's dataView change
        openTimelineById(this.auditbeatTimelineId).then(() => {
          openTimelineDataViewPicker();
          openManageDataView();
          cy.get(INDEX_PATTERN_INPUT).should(
            'have.value',
            '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*'
          );
        });
      });
    });
  });
});
