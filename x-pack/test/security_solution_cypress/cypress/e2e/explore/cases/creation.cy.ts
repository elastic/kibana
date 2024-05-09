/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestCase } from '../../../objects/case';
import { getCase1 } from '../../../objects/case';

import {
  ALL_CASES_CLOSED_CASES_STATS,
  ALL_CASES_COMMENTS_COUNT,
  ALL_CASES_IN_PROGRESS_CASES_STATS,
  ALL_CASES_NAME,
  ALL_CASES_STATUS_FILTER,
  ALL_CASES_OPEN_CASES_STATS,
  ALL_CASES_OPENED_ON,
  ALL_CASES_PAGE_TITLE,
  ALL_CASES_SERVICE_NOW_INCIDENT,
  ALL_CASES_TAGS,
  ALL_CASES_TAGS_COUNT,
} from '../../../screens/all_cases';
import {
  CASE_DETAILS_DESCRIPTION,
  CASE_DETAILS_PAGE_TITLE,
  CASE_DETAILS_STATUS,
  CASE_DETAILS_TAGS,
  CASE_DETAILS_USER_ACTION_DESCRIPTION_EVENT,
  CASE_DETAILS_USERNAMES,
  PARTICIPANTS,
  REPORTER,
  EXPECTED_METRICS,
  CASES_METRIC,
  UNEXPECTED_METRICS,
} from '../../../screens/case_details';
import { TIMELINE_QUERY, TIMELINE_TITLE } from '../../../screens/timeline';

import { OVERVIEW_CASE_DESCRIPTION, OVERVIEW_CASE_NAME } from '../../../screens/overview';

import { goToCaseDetails, goToCreateNewCase } from '../../../tasks/all_cases';
import { createTimeline, deleteTimelines } from '../../../tasks/api_calls/timelines';
import { openCaseTimeline } from '../../../tasks/case_details';
import {
  attachTimeline,
  backToCases,
  createCase,
  fillCasesMandatoryfields,
  filterStatusOpen,
} from '../../../tasks/create_new_case';
import { login } from '../../../tasks/login';
import { visit, visitWithTimeRange } from '../../../tasks/navigation';

import { CASES_URL, OVERVIEW_URL } from '../../../urls/navigation';
import { CLOUD_SERVERLESS, ELASTICSEARCH_USERNAME } from '../../../env_var_names_constants';
import { deleteCases } from '../../../tasks/api_calls/cases';

// https://github.com/elastic/kibana/issues/179231
const isCloudServerless = Cypress.env(CLOUD_SERVERLESS);
const username = isCloudServerless ? 'admin' : Cypress.env(ELASTICSEARCH_USERNAME);

// Tracked by https://github.com/elastic/security-team/issues/7696
describe('Cases', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteTimelines();
    deleteCases();

    createTimeline(getCase1().timeline).then((response) =>
      cy
        .wrap({
          ...getCase1(),
          timeline: {
            ...getCase1().timeline,
            id: response.body.data.persistTimeline.timeline.savedObjectId,
          },
        })
        .as('mycase')
    );
  });

  it('Creates a new case with timeline and opens the timeline', function () {
    login();
    visit(CASES_URL);
    goToCreateNewCase();
    fillCasesMandatoryfields(this.mycase);
    attachTimeline(this.mycase);
    createCase();
    backToCases();

    filterStatusOpen();

    cy.get(ALL_CASES_PAGE_TITLE).should('have.text', 'Cases');
    cy.get(ALL_CASES_OPEN_CASES_STATS).should('have.text', '1');
    cy.get(ALL_CASES_CLOSED_CASES_STATS).should('have.text', '0');
    cy.get(ALL_CASES_IN_PROGRESS_CASES_STATS).should('have.text', '0');
    cy.get(ALL_CASES_STATUS_FILTER).should('have.text', 'Status1');
    cy.get(ALL_CASES_TAGS_COUNT).should('have.text', 'Tags2');
    cy.get(ALL_CASES_NAME).should('have.text', this.mycase.name);
    (this.mycase as TestCase).tags.forEach((CaseTag) => {
      cy.get(ALL_CASES_TAGS(CaseTag)).should('have.text', CaseTag);
    });
    cy.get(ALL_CASES_COMMENTS_COUNT).should('have.text', '0');
    cy.get(ALL_CASES_OPENED_ON).should('include.text', 'ago');
    cy.get(ALL_CASES_SERVICE_NOW_INCIDENT).should('have.text', 'Not pushed');

    goToCaseDetails();

    const expectedTags = this.mycase.tags.join('');
    cy.get(CASE_DETAILS_PAGE_TITLE).should('have.text', this.mycase.name);
    cy.get(CASE_DETAILS_STATUS).should('have.text', 'Open');
    cy.get(CASE_DETAILS_USER_ACTION_DESCRIPTION_EVENT).should('have.text', 'Description');
    cy.get(CASE_DETAILS_DESCRIPTION).should(
      'have.text',
      `${this.mycase.description} ${this.mycase.timeline.title}`
    );
    cy.get(CASE_DETAILS_USERNAMES).eq(REPORTER).should('contain', username);
    cy.get(CASE_DETAILS_USERNAMES).eq(PARTICIPANTS).should('contain', username);
    cy.get(CASE_DETAILS_TAGS).should('have.text', expectedTags);

    EXPECTED_METRICS.forEach((metric) => {
      cy.get(CASES_METRIC(metric)).should('exist');
    });

    UNEXPECTED_METRICS.forEach((metric) => {
      cy.get(CASES_METRIC(metric)).should('not.exist');
    });

    openCaseTimeline();

    cy.get(TIMELINE_TITLE).contains(this.mycase.timeline.title);
    cy.get(TIMELINE_QUERY).should('have.text', this.mycase.timeline.query);

    visitWithTimeRange(OVERVIEW_URL);
    cy.get(OVERVIEW_CASE_NAME).should('have.text', this.mycase.name);
    cy.get(OVERVIEW_CASE_DESCRIPTION).should(
      'have.text',
      `${this.mycase.description} ${this.mycase.timeline.title}`
    );
  });
});
