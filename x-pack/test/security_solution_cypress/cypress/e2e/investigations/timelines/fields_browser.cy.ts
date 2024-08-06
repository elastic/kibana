/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER,
  FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER,
  FIELDS_BROWSER_MESSAGE_HEADER,
  FIELDS_BROWSER_FILTER_INPUT,
} from '../../../screens/fields_browser';
import { TIMELINE_FIELDS_BUTTON } from '../../../screens/timeline';

import {
  addsHostGeoCityNameToTimeline,
  addsHostGeoContinentNameToTimeline,
  closeFieldsBrowser,
  filterFieldsBrowser,
  removesMessageField,
  resetFields,
} from '../../../tasks/fields_browser';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { openTimelineFieldsBrowser } from '../../../tasks/timeline';

import { hostsUrl } from '../../../urls/navigation';

describe(
  'Fields Browser',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'unifiedComponentsInTimelineDisabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
      openTimelineUsingToggle();
      openTimelineFieldsBrowser();
    });

    describe('Editing the timeline', () => {
      it('should add/remove columns from the alerts table when the user checks/un-checks them', () => {
        const filterInput = 'host.geo.c';

        cy.log('removing the message column');

        cy.get(FIELDS_BROWSER_MESSAGE_HEADER).should('exist');

        removesMessageField();
        closeFieldsBrowser();

        cy.get(FIELDS_BROWSER_MESSAGE_HEADER).should('not.exist');

        cy.log('add host.geo.city_name column');

        cy.get(FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER).should('not.exist');

        openTimelineFieldsBrowser();
        filterFieldsBrowser(filterInput);
        addsHostGeoCityNameToTimeline();
        closeFieldsBrowser();

        cy.get(FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER).should('exist');
      });

      it('should reset all fields in the timeline when `Reset Fields` is clicked', () => {
        const filterInput = 'host.geo.c';

        filterFieldsBrowser(filterInput);

        cy.get(FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER).should('not.exist');

        addsHostGeoContinentNameToTimeline();
        closeFieldsBrowser();

        cy.get(FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER).should('exist');

        openTimelineFieldsBrowser();
        resetFields();

        cy.get(FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER).should('not.exist');

        cy.log('restores focus to the Customize Columns button when `Reset Fields` is clicked');

        cy.get(TIMELINE_FIELDS_BUTTON).should('have.focus');

        cy.log('restores focus to the Customize Columns button when Esc is pressed');

        openTimelineFieldsBrowser();

        cy.get(FIELDS_BROWSER_FILTER_INPUT).type('{esc}');
        cy.get(TIMELINE_FIELDS_BUTTON).should('have.focus');
      });
    });
  }
);
