/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../../../tasks/login';
import { getNewRule } from '../../../../../objects/rule';
import { expandFirstAlert } from '../../../../../tasks/alerts';
import { createRule } from '../../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { ALERTS_URL } from '../../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../../tasks/create_new_rule';
import {
  asigneesMenuItemsAreNotAvailable,
  cannotAddAssigneesViaDetailsFlyout,
  loadPageAs,
} from '../../../../../tasks/alert_assignments';

describe('Alert user assignment - Basic License', { tags: ['@ess'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
    login();
    cy.request({
      method: 'POST',
      url: '/api/license/start_basic?acknowledge=true',
      headers: {
        'kbn-xsrf': 'cypress-creds',
        'x-elastic-internal-origin': 'security-solution',
      },
    }).then(({ body }) => {
      cy.log(`body: ${JSON.stringify(body)}`);
      expect(body).contains({
        acknowledged: true,
        basic_was_started: true,
      });
    });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
  });

  beforeEach(() => {
    loadPageAs(ALERTS_URL);
    deleteAlertsAndRules();
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    waitForAlertsToPopulate();
  });

  it('user with Basic license should not be able to update assignees', () => {
    // Check alerts table
    asigneesMenuItemsAreNotAvailable();

    // Check alert's details flyout
    expandFirstAlert();
    cannotAddAssigneesViaDetailsFlyout();
  });
});
