/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';

import { login, visit } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { openTimelineFieldsBrowser, populateTimeline } from '../../tasks/timeline';

import { HOSTS_URL, ALERTS_URL } from '../../urls/navigation';

import { createRule } from '../../tasks/api_calls/rules';

import { getNewRule } from '../../objects/rule';
import { refreshPage } from '../../tasks/security_header';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { createField } from '../../tasks/create_runtime_field';
import { openAlertsFieldBrowser } from '../../tasks/alerts';
import { deleteRuntimeField } from '../../tasks/sourcerer';
import { GET_DATA_GRID_HEADER } from '../../screens/common/data_grid';
import { GET_TIMELINE_HEADER } from '../../screens/timeline';

const alertRunTimeField = 'field.name.alert.page';
const timelineRuntimeField = 'field.name.timeline';

describe('Create DataView runtime field', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    deleteRuntimeField('security-solution-default', alertRunTimeField);
    deleteRuntimeField('security-solution-default', timelineRuntimeField);
  });

  beforeEach(() => {
    login();
  });

  it('adds field to alert table', () => {
    visit(ALERTS_URL);
    createRule(getNewRule());
    refreshPage();
    waitForAlertsToPopulate();
    openAlertsFieldBrowser();
    createField(alertRunTimeField);
    cy.get(GET_DATA_GRID_HEADER(alertRunTimeField)).should('exist');
  });

  it('adds field to timeline', () => {
    visit(HOSTS_URL);
    openTimelineUsingToggle();
    populateTimeline();
    openTimelineFieldsBrowser();

    createField(timelineRuntimeField);
    cy.get(GET_TIMELINE_HEADER(timelineRuntimeField)).should('exist');
  });
});
