/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { TIMELINE_HEADER } from '../../../screens/timeline';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { ALERTS_URL } from '../../../urls/navigation';
import { createRule } from '../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { getNewRule } from '../../../objects/rule';
import { login } from '../../../tasks/login';
import { visit, visitWithTimeRange } from '../../../tasks/navigation';
import { TIMELINES_URL } from '../../../urls/navigation';
import { deleteTimelines } from '../../../tasks/api_calls/timelines';

describe('Open timeline', { tags: ['@serverless', '@ess'] }, () => {
  let timelineSavedObjectId: string | null = null;
  beforeEach(function () {
    login();
    deleteTimelines();
    visit(TIMELINES_URL);
    createTimeline().then((response) => {
      timelineSavedObjectId = response.body.data.persistTimeline.timeline.savedObjectId;
      return response.body.data.persistTimeline.timeline.savedObjectId;
    });
    createRule(getNewRule());
    visitWithTimeRange(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('should open a timeline via url alone without a saved object id', () => {
    const urlWithoutSavedObjectId = `${ALERTS_URL}?timeline=(activeTab:query,isOpen:!t)`;
    visit(urlWithoutSavedObjectId);
    cy.get(TIMELINE_HEADER).should('be.visible');
  });

  it('should also support opening with a saved object id', () => {
    cy.location('search').then((search) => {
      const params = new URLSearchParams(search);
      const timelineParams = encode({
        activeTab: 'query',
        isOpen: true,
        id: timelineSavedObjectId,
      });
      params.set('timeline', timelineParams);
      const urlWithSavedObjectId = `${ALERTS_URL}?${params.toString()}`;
      visit(urlWithSavedObjectId);
      cy.get(TIMELINE_HEADER).should('be.visible');
    });
  });
});
