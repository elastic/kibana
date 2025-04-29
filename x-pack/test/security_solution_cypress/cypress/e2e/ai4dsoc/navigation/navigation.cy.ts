/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { GET_STARTED_URL } from '../../../urls/navigation';
import { AI_SOC_NAVIGATION } from '../../../screens/ai_soc';

const visibleLinks = ['discover', 'attack_discovery', 'case', 'alert_summary', 'configurations'];

const notVisibleLinks = ['machine_learning-landing', 'alerts', 'rules'];

describe('AI$DSOC Navigation', { tags: '@serverless' }, () => {
  beforeEach(() => {
    login('admin');
    visit(GET_STARTED_URL);
  });
  describe('renders links correctly', () => {
    it('should contain the specified links', () => {
      cy.get(AI_SOC_NAVIGATION)
        .should('exist')
        .within(() => {
          visibleLinks.map((link) => {
            cy.getByTestSubjContains(`nav-item-id-${link}`).should('exist');
          });

          notVisibleLinks.map((link) => {
            cy.getByTestSubjContains(`nav-item-id-${link}`).should('not.exist');
          });
        });
    });
  });
});
