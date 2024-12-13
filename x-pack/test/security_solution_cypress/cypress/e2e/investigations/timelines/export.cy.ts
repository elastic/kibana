/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  exportTimeline,
  selectTimeline,
  selectAllTimelines,
  exportSelectedTimelines,
} from '../../../tasks/timelines';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { deleteTimelines } from '../../../tasks/api_calls/timelines';

import { TIMELINES_URL } from '../../../urls/navigation';
import { TOASTER } from '../../../screens/alerts_detection_rules';
import { TIMELINE_CHECKBOX } from '../../../screens/timelines';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { expectedExportedTimeline } from '../../../objects/timeline';
import { closeToast } from '../../../tasks/common/toast';
import { getFullname } from '../../../tasks/common';

describe('Export timelines', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteTimelines();
    cy.intercept({
      method: 'POST',
      path: '/api/timeline/_export?file_name=timelines_export.ndjson',
    }).as('export');
    createTimeline().then((response) => {
      cy.wrap(response).as('timelineResponse1');
      cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('timelineId1');
    });
    createTimeline().then((response) => {
      cy.wrap(response).as('timelineResponse2');
      cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('timelineId2');
    });
    visit(TIMELINES_URL);
  });

  /**
   *  TODO: Good candidate for converting to a jest Test
   *  https://github.com/elastic/kibana/issues/195612
   *  Failing: https://github.com/elastic/kibana/issues/187550
   */
  it.skip('should export custom timeline(s)', function () {
    cy.log('Export a custom timeline via timeline actions');

    exportTimeline(this.timelineId1);
    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      getFullname('admin').then((username) => {
        cy.wrap(response?.body).should(
          'eql',
          expectedExportedTimeline(this.timelineResponse1, username as string)
        );
      });
    });
    closeToast();

    cy.log('Export a custom timeline via bulk actions');

    selectTimeline(this.timelineId1);
    exportSelectedTimelines();
    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);

      getFullname('admin').then((username) => {
        cy.wrap(response?.body).should(
          'eql',
          expectedExportedTimeline(this.timelineResponse1, username as string)
        );
      });
    });

    closeToast();

    cy.log('Export all custom timelines via bulk actions');

    cy.get(TIMELINE_CHECKBOX(this.timelineId1)).should('exist'); // wait for all timelines to be loaded
    selectAllTimelines();
    exportSelectedTimelines();

    const expectedNumberCustomRulesToBeExported = 2;
    cy.get(TOASTER).should(
      'have.text',
      `Successfully exported ${expectedNumberCustomRulesToBeExported} timelines`
    );

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      const timelines = response?.body?.split('\n');

      getFullname('admin').then((username) => {
        assert.deepEqual(
          JSON.parse(timelines[0]),
          expectedExportedTimeline(this.timelineResponse2, username as string)
        );
        assert.deepEqual(
          JSON.parse(timelines[1]),
          expectedExportedTimeline(this.timelineResponse1, username as string)
        );
      });
    });
  });
});
