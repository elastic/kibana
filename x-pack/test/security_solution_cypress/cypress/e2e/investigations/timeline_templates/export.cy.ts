/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { exportTimeline } from '../../../tasks/timelines';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  expectedExportedTimelineTemplate,
  getTimeline as getTimelineTemplate,
} from '../../../objects/timeline';

import { TIMELINE_TEMPLATES_URL } from '../../../urls/navigation';
import { createTimelineTemplate } from '../../../tasks/api_calls/timelines';
import { cleanKibana } from '../../../tasks/common';
import { searchByTitle } from '../../../tasks/table_pagination';

describe('Export timelines', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();

    createTimelineTemplate(getTimelineTemplate()).then((response) => {
      cy.wrap(response).as('templateResponse');
      cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('templateId');
      cy.wrap(response.body.data.persistTimeline.timeline.title).as('templateTitle');
    });
  });

  it('Exports a custom timeline template', function () {
    cy.intercept({
      method: 'POST',
      path: '/api/timeline/_export?file_name=timelines_export.ndjson',
    }).as('export');
    login();
    visitWithoutDateRange(TIMELINE_TEMPLATES_URL);
    searchByTitle(this.templateTitle);
    exportTimeline(this.templateId);

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);

      cy.wrap(response?.body).should(
        'eql',
        expectedExportedTimelineTemplate(this.templateResponse)
      );
    });
  });
});
