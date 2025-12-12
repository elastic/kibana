/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIELDS_BROWSER_CHECKBOX,
  FIELDS_BROWSER_SELECTED_CATEGORIES_BADGES,
  FIELDS_BROWSER_VIEW_BUTTON,
} from '../../../screens/fields_browser';
import {
  HOST_GEO_CITY_NAME_HEADER,
  HOST_GEO_COUNTRY_NAME_HEADER,
  SERVER_SIDE_EVENT_COUNT,
} from '../../../screens/hosts/events';

import {
  activateViewAll,
  activateViewSelected,
  closeFieldsBrowser,
  filterFieldsBrowser,
} from '../../../tasks/fields_browser';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { openEvents } from '../../../tasks/hosts/main';
import {
  addsHostGeoCityNameToHeader,
  addsHostGeoCountryNameToHeader,
  openEventsViewerFieldsBrowser,
  waitsForEventsToBeLoaded,
} from '../../../tasks/hosts/events';
import { kqlSearch } from '../../../tasks/security_header';

import { hostsUrl } from '../../../urls/navigation';
import { resetFields } from '../../../tasks/timeline';
import { DATA_GRID_EMPTY_STATE } from '../../../screens/events_viewer';

const defaultHeadersInDefaultEcsCategory = [
  { id: '@timestamp' },
  { id: 'message' },
  { id: 'host.name' },
  { id: 'event.action' },
  { id: 'user.name' },
  { id: 'source.ip' },
  { id: 'destination.ip' },
];

describe('Events Viewer', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
  });

  context('Fields rendering', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
      openEvents();
      openEventsViewerFieldsBrowser();
    });

    it('displays "view all" option by default', () => {
      cy.get(FIELDS_BROWSER_VIEW_BUTTON).should('contain.text', 'View: all');
    });

    it('displays all categories (by default)', () => {
      cy.get(FIELDS_BROWSER_SELECTED_CATEGORIES_BADGES).should('be.empty');
    });

    it('displays only the default selected fields when "view selected" option is enabled', () => {
      activateViewSelected();
      defaultHeadersInDefaultEcsCategory.forEach((header) =>
        cy.get(FIELDS_BROWSER_CHECKBOX(header.id)).should('be.checked')
      );
      activateViewAll();
    });
  });

  context('Events viewer fields behaviour', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
      openEvents();
      openEventsViewerFieldsBrowser();
    });

    it('adds a field to the events viewer when the user clicks the checkbox', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);
      cy.get(HOST_GEO_CITY_NAME_HEADER).should('not.exist');
      addsHostGeoCityNameToHeader();
      closeFieldsBrowser();
      cy.get(HOST_GEO_CITY_NAME_HEADER).should('exist');
    });

    it('resets all fields in the events viewer when `Reset Fields` is clicked', () => {
      const filterInput = 'host.geo.c';
      filterFieldsBrowser(filterInput);
      cy.get(HOST_GEO_COUNTRY_NAME_HEADER).should('not.exist');
      addsHostGeoCountryNameToHeader();
      resetFields();
      cy.get(HOST_GEO_COUNTRY_NAME_HEADER).should('not.exist');
    });
  });

  context('Events behavior', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
      openEvents();
      waitsForEventsToBeLoaded();
    });

    it('filters the events by applying filter criteria from the search bar at the top of the page', () => {
      const filterInput = 'aa7ca589f1b8220002f2fc61c64cfbf1'; // this will never match real data
      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      kqlSearch(`${filterInput}{enter}`);
      cy.get(SERVER_SIDE_EVENT_COUNT).should('not.exist');
      cy.get(DATA_GRID_EMPTY_STATE).should('exist');
    });
  });
});
