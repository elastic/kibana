/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIMELINES_OVERVIEW_TABLE,
  TIMELINES_OVERVIEW_ONLY_FAVORITES,
  TIMELINES_OVERVIEW_SEARCH,
} from '../../../screens/timelines';

import {
  getTimeline,
  getFavoritedTimeline,
  sharedTimelineTitleFragment,
} from '../../../objects/timeline';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  createTimeline,
  deleteTimelines,
  favoriteTimeline,
} from '../../../tasks/api_calls/timelines';

import { TIMELINES_URL } from '../../../urls/navigation';

const mockTimeline = getTimeline();
const mockFavoritedTimeline = getFavoritedTimeline();

describe('timeline overview search', { tags: ['@ess', 'serverless'] }, () => {
  beforeEach(() => {
    deleteTimelines();
    createTimeline(mockFavoritedTimeline)
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId) => favoriteTimeline({ timelineId, timelineType: 'default' }));
    createTimeline();
    login();
    visit(TIMELINES_URL);
    cy.get(TIMELINES_OVERVIEW_SEARCH).clear();
  });

  it('should show all timelines when no search term was entered', () => {
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title);
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title);
  });

  it('should show the correct favorite count without search', () => {
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(1);
  });

  it('should show the correct timelines when the favorite filter is activated', () => {
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).click(); // enable the filter
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title).should('not.exist');
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title);
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(1);

    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).click(); // disable the filter
  });

  // TODO: cy.get(TIMELINES_OVERVIEW_SEARCH).type('{enter}') does not work here;
  it.skip('should find the correct timeline and have the correct favorite count when searching by timeline title', () => {
    cy.get(TIMELINES_OVERVIEW_SEARCH).type(`"${mockTimeline.title}"{enter}`);

    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title).should('not.exist');
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title);
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(0);
  });

  it('should find the correct timelines when searching for favorited timelines', () => {
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).click(); // enable the filter
    cy.get(TIMELINES_OVERVIEW_TABLE).should('be.visible');
    cy.get(TIMELINES_OVERVIEW_SEARCH).type(`"${mockFavoritedTimeline.title}"{enter}`);
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title).should('not.exist');
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title);
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(1);

    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).click(); // disable the filter
  });

  it('should find the correct timelines when both favorited and non-favorited timelines match', () => {
    cy.get(TIMELINES_OVERVIEW_SEARCH).type(`${sharedTimelineTitleFragment}{enter}`);

    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title);
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title);
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(1);
  });
});
