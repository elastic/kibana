/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_HEADER, TIMELINE_TABS } from '../../../screens/timeline';

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { executeTimelineSearch, toggleFullScreen } from '../../../tasks/timeline';

import { hostsUrl } from '../../../urls/navigation';

describe('Toggle full screen', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    visitWithTimeRange(hostsUrl('allHosts'));
    openTimelineUsingToggle();
    executeTimelineSearch('*');
  });

  it('Should hide timeline header and tab list area', () => {
    toggleFullScreen();

    cy.get(TIMELINE_TABS).should('not.exist');
    cy.get(TIMELINE_HEADER).should('not.be.visible');
  });

  it('Should show timeline header and tab list area', () => {
    toggleFullScreen();
    toggleFullScreen();
    cy.get(TIMELINE_TABS).should('exist');
    cy.get(TIMELINE_HEADER).should('be.visible');
  });
});
