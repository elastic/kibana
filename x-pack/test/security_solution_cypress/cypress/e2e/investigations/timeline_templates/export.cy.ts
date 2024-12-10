/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exportTimeline } from '../../../tasks/timelines';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { expectedExportedTimelineTemplate } from '../../../objects/timeline';

import { TIMELINE_TEMPLATES_URL } from '../../../urls/navigation';
import { createTimelineTemplate, deleteTimelines } from '../../../tasks/api_calls/timelines';
import { searchByTitle } from '../../../tasks/table_pagination';
import { getFullname } from '../../../tasks/common';

describe('Export timelines', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteTimelines();
    createTimelineTemplate().then((response) => {
      cy.wrap(response).as('templateResponse');
      cy.wrap(response.body.savedObjectId).as('templateId');
      cy.wrap(response.body.title).as('templateTitle');
    });
  });

  it('Exports a custom timeline template', function () {
    cy.intercept({
      method: 'POST',
      path: '/api/timeline/_export?file_name=timelines_export.ndjson',
    }).as('export');
    login();
    visit(TIMELINE_TEMPLATES_URL);
    searchByTitle(this.templateTitle);
    exportTimeline(this.templateId);

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      getFullname('admin').then((username) => {
        cy.wrap(response?.body).should(
          'eql',
          expectedExportedTimelineTemplate(this.templateResponse, username as string)
        );
      });
    });
  });
});
