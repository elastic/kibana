/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INSPECT_MODAL,
  INSPECT_MODAL_REQUEST_TAB,
  INSPECT_MODAL_RESPONSE_TAB,
} from '../../../../screens/inspect';
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
import { GET_DISCOVER_DATA_GRID_CELL_HEADER } from '../../../../screens/discover';
import { addFieldToTable, removeFieldFromTable } from '../../../../tasks/discover';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../../tasks/security_main';
import {
  createNewTimeline,
  executeTimelineSearch,
  openTimelineInspectButton,
} from '../../../../tasks/timeline';
import { ALERTS_URL } from '../../../../urls/navigation';
import { openTab } from '../../../../tasks/inspect';
import { CODE_BLOCK } from '../../../../screens/common';

describe(
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

    it('should be able inspect without any issues', () => {
      openTimelineInspectButton();
      cy.get(INSPECT_MODAL).should('be.visible');
      openTab(INSPECT_MODAL_REQUEST_TAB);
      cy.get(INSPECT_MODAL_REQUEST_TAB).should('have.attr', 'aria-selected', 'true');
      cy.get(INSPECT_MODAL).within(() => {
        cy.get(CODE_BLOCK)
          .should('be.visible')
          .then(($codeEditor) => {
            const { height } = $codeEditor[0].getBoundingClientRect();
            expect(height).to.be.gt(100);
          });
      });

      openTab(INSPECT_MODAL_RESPONSE_TAB);
      cy.get(INSPECT_MODAL_RESPONSE_TAB).should('have.attr', 'aria-selected', 'true');
      cy.get(INSPECT_MODAL).within(() => {
        cy.get(CODE_BLOCK)
          .should('be.visible')
          .then(($codeEditor) => {
            const { height } = $codeEditor[0].getBoundingClientRect();
            expect(height).to.be.gt(100);
          });
      });
    });

    it('should be able to add/remove columns correctly', () => {
      cy.get(GET_UNIFIED_DATA_GRID_CELL_HEADER('agent.type')).should('not.exist');
      addFieldToTable('agent.type');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('agent.type')).should('be.visible');
      removeFieldFromTable('agent.type');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('agent.type')).should('not.exist');
    });

    context('flyout', () => {
      it('should be able to open/close details details/host/user flyout', () => {
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
