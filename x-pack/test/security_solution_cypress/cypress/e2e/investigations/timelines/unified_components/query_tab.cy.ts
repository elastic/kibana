/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  closeTimelineFlyout,
  openEventDetailsFlyout,
  openHostDetailsFlyout,
  openUserDetailsFlyout,
} from '../../../../tasks/unified_timeline';
import {
  GET_UNIFIED_DATA_GRID_CELL_HEADER,
  HOST_DETAILS_FLYOUT,
  TIMELINE_DETAILS_FLYOUT,
  USER_DETAILS_FLYOUT,
} from '../../../../screens/unified_timeline';
import {
  ROW_ADD_NOTES_BUTTON,
  ADD_NOTE_CONTAINER,
  RESOLVER_GRAPH_CONTAINER,
} from '../../../../screens/timeline';
import { OPEN_ANALYZER_BTN } from '../../../../screens/alerts';
import { GET_DISCOVER_DATA_GRID_CELL_HEADER } from '../../../../screens/discover';
import { addFieldToTable, removeFieldFromTable } from '../../../../tasks/discover';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../../tasks/security_main';
import { createNewTimeline, executeTimelineSearch } from '../../../../tasks/timeline';
import { ALERTS_URL } from '../../../../urls/navigation';

// FLAKY: https://github.com/elastic/kibana/issues/181882
describe.skip(
  'Unsaved Timeline query tab',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'unifiedComponentsInTimelineEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      openTimelineUsingToggle();
      createNewTimeline();
      executeTimelineSearch('*');
    });

    it('should be able to add/remove columns correctly', () => {
      cy.get(GET_UNIFIED_DATA_GRID_CELL_HEADER('agent.type')).should('not.exist');
      addFieldToTable('agent.type');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('agent.type')).should('be.visible');
      removeFieldFromTable('agent.type');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('agent.type')).should('not.exist');
    });

    it('should render the add note button and display the markdown editor', () => {
      cy.get(ROW_ADD_NOTES_BUTTON).should('be.visible').realClick();
      cy.get(ADD_NOTE_CONTAINER).should('be.visible');
    });

    it('should render the analyze event button and display the process analyzer visualization', () => {
      cy.get(OPEN_ANALYZER_BTN).should('be.visible').realClick();
      cy.get(RESOLVER_GRAPH_CONTAINER).should('be.visible');
    });

    // these tests are skipped until we implement the expandable flyout in the unified table for timeline
    context('flyout', () => {
      it.skip('should be able to open/close details details/host/user flyout', () => {
        cy.log('Event Details Flyout');
        openEventDetailsFlyout(0);
        cy.get(TIMELINE_DETAILS_FLYOUT).should('be.visible');
        closeTimelineFlyout();
        cy.log('Host Details Flyout');
        openHostDetailsFlyout(0);
        cy.get(HOST_DETAILS_FLYOUT).should('be.visible');
        closeTimelineFlyout();
        cy.log('User Details Flyout');
        openUserDetailsFlyout(0);
        cy.get(USER_DETAILS_FLYOUT).should('be.visible');
      });
    });
  }
);
