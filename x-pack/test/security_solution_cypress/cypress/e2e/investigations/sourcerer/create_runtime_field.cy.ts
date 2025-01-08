/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import {
  createRuntimeFieldFromTimelne as createRuntimeFieldFromTimeline,
  populateTimeline,
} from '../../../tasks/timeline';

import { hostsUrl, ALERTS_URL } from '../../../urls/navigation';

import { createRule } from '../../../tasks/api_calls/rules';

import { getNewRule } from '../../../objects/rule';
import { refreshPage } from '../../../tasks/security_header';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { createField } from '../../../tasks/create_runtime_field';
import { openAlertsFieldBrowser } from '../../../tasks/alerts';
import { GET_DATA_GRID_HEADER } from '../../../screens/common/data_grid';
import { deleteRuntimeField } from '../../../tasks/api_calls/sourcerer';
import { SAVE_FIELD_BUTTON } from '../../../screens/create_runtime_field';

const alertRunTimeField = 'field.name.alert.page';
const timelineRuntimeField = 'field.name.timeline';

describe('Create DataView runtime field', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteRuntimeField('security-solution-default', alertRunTimeField);
    deleteRuntimeField('security-solution-default', timelineRuntimeField);
  });

  it('adds field to alert table', () => {
    visitWithTimeRange(ALERTS_URL);
    createRule(getNewRule());
    refreshPage();
    waitForAlertsToPopulate();
    openAlertsFieldBrowser();
    createField(alertRunTimeField);
    cy.get(GET_DATA_GRID_HEADER(alertRunTimeField)).should('exist');
  });

  it('adds field to timeline', () => {
    visitWithTimeRange(hostsUrl('allHosts'));
    openTimelineUsingToggle();
    populateTimeline();
    createRuntimeFieldFromTimeline(timelineRuntimeField);
    // NOTE: the field creation dialog should be closed now
    // meaning that the field creation has been successful
    cy.get(SAVE_FIELD_BUTTON).should('not.exist');
  });
});
