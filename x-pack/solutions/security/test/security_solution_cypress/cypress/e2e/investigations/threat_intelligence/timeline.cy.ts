/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitWithTimeRange } from '../../../tasks/navigation';
import {
  addToTimelineFromBarchartLegend,
  addToTimelineFromFlyoutOverviewTabBlock,
  addToTimelineFromFlyoutOverviewTabTable,
  addToTimelineFromTableCell,
  closeTimeline,
  investigateInTimelineFromFlyout,
  investigateInTimelineFromTable,
  openTimeline,
} from '../../../tasks/threat_intelligence/timeline';
import {
  closeFlyout,
  openFlyout,
  openFlyoutTakeAction,
  waitForViewToBeLoaded,
} from '../../../tasks/threat_intelligence/common';
import {
  TIMELINE_AND_OR_BADGE,
  TIMELINE_DATA_PROVIDERS_WRAPPER,
  TIMELINE_DRAGGABLE_ITEM,
} from '../../../screens/threat_intelligence/timeline';
import { login } from '../../../tasks/login';

const URL = '/app/security/threat_intelligence/indicators';

describe('Timeline', { tags: ['@ess'] }, () => {
  before(() => cy.task('esArchiverLoad', { archiveName: 'ti_indicators_data_single' }));

  after(() => cy.task('esArchiverUnload', { archiveName: 'ti_indicators_data_single' }));

  beforeEach(() => {
    login();
    visitWithTimeRange(URL);
    waitForViewToBeLoaded();
  });

  it('should verify add to timeline and investigate in timeline work from various places', () => {
    cy.log('add to timeline when clicking in the barchart legend');

    addToTimelineFromBarchartLegend();
    openTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 3);
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('contain.text', 'threat.feed.name: "AbuseCH Malware"');
    });
    closeTimeline();

    cy.log('add to timeline when clicking in an indicator flyout overview tab table row');

    openFlyout();
    addToTimelineFromFlyoutOverviewTabTable();
    closeFlyout();
    openTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 5);
      cy.get(TIMELINE_DRAGGABLE_ITEM).should(
        'contain.text',
        'threat.indicator.file.hash.md5: "a7f997be65f62fdbe5ec076f0fe207f7"'
      );
    });

    closeTimeline();

    cy.log(
      'add to timeline when clicking in an indicator flyout overview block (should not add a new entry)'
    );

    openFlyout();
    addToTimelineFromFlyoutOverviewTabBlock();
    closeFlyout();
    openTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 5);
    });

    closeTimeline();

    cy.log('add to timeline when clicking in an indicator table cell');

    addToTimelineFromTableCell();
    openTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 7);
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('contain.text', 'threat.indicator.type: "file"');
    });

    closeTimeline();

    cy.log('investigate in timeline when clicking in an indicator table action row');

    investigateInTimelineFromTable();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 5);
    });

    closeTimeline();

    cy.log('investigate in timeline when clicking in an indicator flyout');

    openFlyout();
    openFlyoutTakeAction();
    investigateInTimelineFromFlyout();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 5);
    });
  });
});
