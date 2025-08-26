/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIMELINE_DROPPED_DATA_PROVIDERS,
  TIMELINE_DATA_PROVIDERS_ACTION_MENU,
  TIMELINE_FLYOUT_HEADER,
  TIMELINE_DATA_PROVIDERS_CONTAINER,
  GET_TIMELINE_GRID_CELL_VALUE,
} from '../../../screens/timeline';

import { waitForAllHostsToBeLoaded } from '../../../tasks/hosts/all_hosts';

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import {
  addDataProvider,
  addNameAndDescriptionToTimeline,
  populateTimeline,
  createTimelineFromBottomBar,
  updateDataProviderByFieldHoverAction,
  saveTimeline,
} from '../../../tasks/timeline';
import { getTimeline } from '../../../objects/timeline';
import { hostsUrl } from '../../../urls/navigation';
import { LOADING_INDICATOR } from '../../../screens/security_header';

const mockTimeline = getTimeline();
describe('Timeline data providers', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    cy.intercept('PATCH', '/api/timeline').as('updateTimeline');
    visitWithTimeRange(hostsUrl('allHosts'));
    waitForAllHostsToBeLoaded();
    createTimelineFromBottomBar();
    addNameAndDescriptionToTimeline(mockTimeline);
    populateTimeline();
  });

  it('should display the data provider action menu when Enter is pressed', () => {
    addDataProvider({ field: 'host.name', operator: 'exists' });

    cy.get(TIMELINE_DATA_PROVIDERS_ACTION_MENU).should('not.exist');
    cy.get(`${TIMELINE_FLYOUT_HEADER} ${TIMELINE_DROPPED_DATA_PROVIDERS}`)
      .first()
      .parent()
      .type('{enter}');

    cy.get(TIMELINE_DATA_PROVIDERS_ACTION_MENU).should('exist');
  });

  it('should persist timeline when a field is added by hover action "Add To Timeline" in data provider ', () => {
    addDataProvider({ field: 'host.name', operator: 'exists' });
    saveTimeline();
    cy.wait('@updateTimeline');
    cy.get(LOADING_INDICATOR).should('not.exist');
    updateDataProviderByFieldHoverAction('host.name', 0);
    saveTimeline();
    cy.wait('@updateTimeline');
    cy.reload();
    cy.get(`${GET_TIMELINE_GRID_CELL_VALUE('host.name')}`)
      .first()
      .then((hostname) => {
        cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).should((dataProviderContainer) => {
          expect(dataProviderContainer).to.contain(`host.name: "${hostname.text().trim()}"`);
        });
      });
  });
});
