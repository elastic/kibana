/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { getNewRule } from '../../../../../objects/rule';
import { expandFirstAlert } from '../../../../../tasks/alerts';
import { createRule } from '../../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { ALERTS_URL } from '../../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../../tasks/create_new_rule';
import {
  alertsTableMoreActionsAreNotAvailable,
  cannotAddAssigneesViaDetailsFlyout,
  loadPageAs,
} from '../../../../../tasks/alert_assignments';

describe('Alert user assignment - ESS', { tags: ['@ess'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
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

  it('viewer/reader should not be able to update assignees', () => {
    // Login as a reader
    loadPageAs(ALERTS_URL, ROLES.reader);
    waitForAlertsToPopulate();

    // Check alerts table
    alertsTableMoreActionsAreNotAvailable();

    // Check alert's details flyout
    expandFirstAlert();
    cannotAddAssigneesViaDetailsFlyout();
  });
});
