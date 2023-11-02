/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES, SecurityRoleName } from '@kbn/security-solution-plugin/common/test';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { RULES_MANAGEMENT_URL } from '../../../urls/rules_management';
import { VALUE_LISTS_MODAL_ACTIVATOR } from '../../../screens/lists';

const CAN_IMPORT_VALUE_LISTS: SecurityRoleName[] = [
  ROLES.t3_analyst,
  // ROLES.threat_intelligence_analyst,
  ROLES.rule_author,
  ROLES.detections_admin,
  ROLES.soc_manager,
  ROLES.platform_engineer,
  // ROLES.endpoint_policy_manager,
];

const CANNOT_IMPORT_VALUE_LISTS: SecurityRoleName[] = [
  ROLES.t1_analyst,
  ROLES.t2_analyst,
  ROLES.endpoint_operations_analyst,
];

describe('value list permissions', { tags: ['@ess', '@serverless'] }, () => {
  CAN_IMPORT_VALUE_LISTS.forEach((role) => {
    it(`${role} is allowed to upload a value list`, () => {
      login(role);
      visit(RULES_MANAGEMENT_URL, { role });
      cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('not.have.attr', 'disabled');
    });
  });

  CANNOT_IMPORT_VALUE_LISTS.forEach((role) => {
    it(`${role} is NOT allowed to upload a value list`, () => {
      login(role);
      visit(RULES_MANAGEMENT_URL, { role });
      cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('have.attr', 'disabled');
    });
  });
});
