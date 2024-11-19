/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import {
  createNewTimeline,
  addNameAndDescriptionToTimeline,
  populateTimeline,
} from '../../../tasks/timeline';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { ALERTS_URL } from '../../../urls/navigation';
import { getTimeline } from '../../../objects/timeline';
import { TIMELINE_EVENT, TIMELINE_FILTER_BADGE_ENABLED } from '../../../screens/timeline';
import {
  GET_UNIFIED_DATA_GRID_CELL,
  UNIFIED_TABLE_HOVER_ACTIONS,
} from '../../../screens/unified_timeline';

const mockTimeline = getTimeline();
describe(
  `timeline cell actions`,
  {
    tags: ['@ess'],
  },
  () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      openTimelineUsingToggle();
      createNewTimeline();
      addNameAndDescriptionToTimeline(mockTimeline);
      populateTimeline();
    });
    it('filter in', () => {
      cy.get(GET_UNIFIED_DATA_GRID_CELL('event.category', 0)).realHover();
      cy.get(UNIFIED_TABLE_HOVER_ACTIONS.FILTER_FOR).should('be.visible').click();
      cy.get(TIMELINE_FILTER_BADGE_ENABLED).should('be.visible');
    });

    it('filter out', () => {
      cy.get(GET_UNIFIED_DATA_GRID_CELL('event.category', 0)).realHover();
      cy.get(UNIFIED_TABLE_HOVER_ACTIONS.FILTER_OUT).should('be.visible').click();
      cy.get(TIMELINE_EVENT).should('not.exist');
    });
  }
);
