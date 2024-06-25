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
import { getFavoritedTimeline, getTimeline } from '../../../objects/timeline';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { createTimeline, deleteTimelines } from '../../../tasks/api_calls/timelines';
import { TIMELINES_URL } from '../../../urls/navigation';
import {
  closeTimeline,
  markAsFavorite,
  openTimelineById,
  refreshTimelinesUntilTimeLinePresent,
} from '../../../tasks/timeline';
import { clearSearchBar, searchForTimeline, toggleFavoriteFilter } from '../../../tasks/timelines';

const mockTimeline = getTimeline();
const mockFavoritedTimeline = getFavoritedTimeline();

// FLAKY: https://github.com/elastic/kibana/issues/181466
// Failing: See https://github.com/elastic/kibana/issues/181466
describe.skip('timeline overview search', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteTimelines();
    createTimeline();
    login();

    visit(TIMELINES_URL);
    cy.get(TIMELINES_OVERVIEW_SEARCH).clear();

    // create timeline and favorite it
    // we're doing it through the UI because doing it through the API currently has a problem on MKI environment
    createTimeline(mockFavoritedTimeline)
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId) => {
        refreshTimelinesUntilTimeLinePresent(timelineId);
        openTimelineById(timelineId);
        markAsFavorite();
        closeTimeline();
      });
  });

  it('should show all timelines when no search term was entered', () => {
    cy.log('should show all timelines when no search term was entered');

    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title);
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title);

    cy.log('should show the correct favorite count without search');

    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(1);

    cy.log('should show the correct timelines when the favorite filter is activated');

    toggleFavoriteFilter(); // enable the favorite toggle

    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title).should('not.exist');
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title);
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(1);

    toggleFavoriteFilter(); // disable the favorite toggle

    cy.log('should apply search correctly');

    searchForTimeline('dark');

    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title).should('not.exist');
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title).should('not.exist');
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(0);

    clearSearchBar();
    searchForTimeline('darkest');

    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title);
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title).should('not.exist');
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(1);

    clearSearchBar();
    searchForTimeline('timeline');

    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockTimeline.title);
    cy.get(TIMELINES_OVERVIEW_TABLE).contains(mockFavoritedTimeline.title);
    cy.get(TIMELINES_OVERVIEW_ONLY_FAVORITES).contains(1);
  });
});
