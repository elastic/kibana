/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { RULES_MANAGEMENT_URL } from '../../../urls/rules_management';
import { VALUE_LISTS_MODAL_ACTIVATOR } from '../../../screens/lists';

describe('value list permissions', { tags: ['@ess', '@skipInServerless'] }, () => {
  describe('user with restricted access role', () => {
    it('Does not allow a t1 analyst user to upload a value list', () => {
      login(ROLES.t1_analyst);
      visit(RULES_MANAGEMENT_URL);
      cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('have.attr', 'disabled');
    });
  });
});
