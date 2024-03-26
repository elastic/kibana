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
  performCellActionAddToTimeline,
  performCellActionFilterIn,
} from '../../../../tasks/unified_timeline';
import {
  GET_UNIFIED_DATA_GRID_CELL,
  GET_UNIFIED_DATA_GRID_CELL_HEADER,
} from '../../../../screens/unified_timeline';
import {
  TIMELINE_DATA_PROVIDERS_CONTAINER,
  TIMELINE_FILTER_BADGE,
} from '../../../../screens/timeline';
import { GET_DISCOVER_DATA_GRID_CELL_HEADER } from '../../../../screens/discover';
import { addFieldToTable, removeFieldFromTable } from '../../../../tasks/discover';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../../tasks/security_main';
import { createNewTimeline, executeTimelineSearch } from '../../../../tasks/timeline';
import { ALERTS_URL } from '../../../../urls/navigation';

describe(
  'Unsaved Timeline query tab',
  {
    tags: ['@ess', '@serverless'],
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

    context('hover actions', () => {
      it('should add to timeline successfully', () => {
        cy.get(GET_UNIFIED_DATA_GRID_CELL('host.name', 0)).then(($el) => {
          const hostName = $el.text();
          performCellActionAddToTimeline('host.name', 0);
          cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).contains(`host.name: "${hostName}"`);
        });
      });
      it('should filter In successfully', () => {
        cy.get(GET_UNIFIED_DATA_GRID_CELL('user.name', 0)).then(($el) => {
          const hostName = $el.text();
          performCellActionFilterIn('user.name', 0);
          cy.get(TIMELINE_FILTER_BADGE).should('have.lengthOf', 1);
          cy.get(TIMELINE_FILTER_BADGE).eq(0).should('have.text', `user.name: ${hostName}`);
        });
      });
    });

    context('flyout', () => {
      it('should be able to open/close details details/host/user flyout', () => {
        cy.log('Event Details Flyout');
        openEventDetailsFlyout(0);
        closeTimelineFlyout();
        cy.log('Host Details Flyout');
        openHostDetailsFlyout(0);
        closeTimelineFlyout();
        cy.log('User Details Flyout');
        openUserDetailsFlyout(0);
        closeTimelineFlyout();
      });
    });
  }
);
