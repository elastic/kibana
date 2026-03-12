/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYZER_NODE } from '../../../screens/alerts';

import { openAnalyzerForFirstAlertInTimeline } from '../../../tasks/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { getNewRule } from '../../../objects/rule';
import { setStartDate } from '../../../tasks/date_picker';
import { TOASTER } from '../../../screens/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';

describe('Analyze events view for alerts', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(getNewRule());
    login();
    visitWithTimeRange(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('should render when button is clicked', () => {
    openAnalyzerForFirstAlertInTimeline();
    cy.get(ANALYZER_NODE).first().should('be.visible');
  });

  it('should display a toast indicating the date range of found events when a time range has 0 events in it', () => {
    const dateContainingZeroEvents = 'Jul 27, 2022 @ 00:00:00.000';
    setStartDate(dateContainingZeroEvents);
    waitForAlertsToPopulate();
    openAnalyzerForFirstAlertInTimeline();
    cy.get(TOASTER).should('be.visible');
    cy.get(ANALYZER_NODE).first().should('be.visible');
  });
});
