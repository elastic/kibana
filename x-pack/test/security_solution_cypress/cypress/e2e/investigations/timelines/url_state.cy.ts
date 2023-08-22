/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { getTimeline } from '../../../objects/timeline';

import { TIMELINE_HEADER } from '../../../screens/timeline';

import { createTimeline } from '../../../tasks/api_calls/timelines';

import { cleanKibana } from '../../../tasks/common';
import { ALERTS_URL } from '../../../urls/navigation';
import { createRule } from '../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { getNewRule } from '../../../objects/rule';

import { login, visitWithoutDateRange, visit } from '../../../tasks/login';

import { TIMELINES_URL } from '../../../urls/navigation';

describe('Open timeline', { tags: [tag.BROKEN_IN_SERVERLESS, tag.ESS] }, () => {
  let timelineSavedObjectId: string | null = null;
  before(function () {
    cleanKibana();
    login();
    visitWithoutDateRange(TIMELINES_URL);

    createTimeline(getTimeline()).then((response) => {
      timelineSavedObjectId = response.body.data.persistTimeline.timeline.savedObjectId;
      return response.body.data.persistTimeline.timeline.savedObjectId;
    });

    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  beforeEach(() => {
    login();
  });

  describe('open timeline from url exclusively', () => {
    it('should open a timeline via url alone without a saved object id', () => {
      const urlWithoutSavedObjectId = `${ALERTS_URL}?timeline=(activeTab:query,isOpen:!t)`;
      visitWithoutDateRange(urlWithoutSavedObjectId);
      cy.get(TIMELINE_HEADER).should('be.visible');
    });

    it('should also support opening with a saved object id', () => {
      const urlWithSavedObjectId = `${ALERTS_URL}?timeline=(id:${timelineSavedObjectId},isOpen:!t)`;
      visitWithoutDateRange(urlWithSavedObjectId);
      cy.get(TIMELINE_HEADER).should('be.visible');
    });
  });
});
