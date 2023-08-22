/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { HOST_STATS, NETWORK_STATS, OVERVIEW_EMPTY_PAGE } from '../../../screens/overview';

import { expandHostStats, expandNetworkStats } from '../../../tasks/overview';
import { login, visit } from '../../../tasks/login';

import { OVERVIEW_URL } from '../../../urls/navigation';

import { cleanKibana } from '../../../tasks/common';
import { createTimeline, favoriteTimeline } from '../../../tasks/api_calls/timelines';
import { getTimeline } from '../../../objects/timeline';

describe('Overview Page', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    cy.task('esArchiverLoad', 'overview');
  });

  beforeEach(() => {
    login();
    visit(OVERVIEW_URL);
  });

  after(() => {
    cy.task('esArchiverUnload', 'overview');
  });

  it('Host stats render with correct values', () => {
    expandHostStats();

    HOST_STATS.forEach((stat) => {
      cy.get(stat.domId).should('have.text', stat.value);
    });
  });

  it('Network stats render with correct values', () => {
    expandNetworkStats();

    NETWORK_STATS.forEach((stat) => {
      cy.get(stat.domId).should('have.text', stat.value);
    });
  });

  describe('Favorite Timelines', () => {
    it('should appear on overview page', () => {
      createTimeline(getTimeline())
        .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
        .then((timelineId: string) => {
          favoriteTimeline({ timelineId, timelineType: 'default' }).then(() => {
            visit(OVERVIEW_URL);
            cy.get('[data-test-subj="overview-recent-timelines"]').should(
              'contain',
              getTimeline().title
            );
          });
        });
    });
  });
});

describe('Overview page with no data', { tags: tag.BROKEN_IN_SERVERLESS }, () => {
  before(() => {
    cy.task('esArchiverUnload', 'auditbeat');
  });
  after(() => {
    cy.task('esArchiverLoad', 'auditbeat');
  });

  it('Splash screen should be here', () => {
    login();
    visit(OVERVIEW_URL);
    cy.get(OVERVIEW_EMPTY_PAGE).should('be.visible');
  });
});
