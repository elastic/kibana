/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_SUPPRESSION_FIELDS_INPUT,
  ALERT_SUPPRESSION_FIELDS,
} from '../../../../screens/create_new_rule';

import { selectIndicatorMatchType } from '../../../../tasks/create_new_rule';
import { startBasicLicense } from '../../../../tasks/api_calls/licensing';

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { TOOLTIP } from '../../../../screens/common';

describe(
  'Detection rules, Indicator Match, Alert Suppression',
  {
    tags: ['@ess'],
  },
  () => {
    describe('Create rule form', () => {
      beforeEach(() => {
        login();
        visit(CREATE_RULE_URL);
        startBasicLicense();
      });

      it('can not create rule with rule execution suppression on basic license', () => {
        selectIndicatorMatchType();

        cy.get(ALERT_SUPPRESSION_FIELDS_INPUT).should('be.disabled');
        cy.get(ALERT_SUPPRESSION_FIELDS).trigger('mouseover');

        // Platinum license is required, tooltip on disabled alert suppression checkbox should tell this
        cy.get(TOOLTIP).contains('Platinum license');
      });
    });
  }
);
