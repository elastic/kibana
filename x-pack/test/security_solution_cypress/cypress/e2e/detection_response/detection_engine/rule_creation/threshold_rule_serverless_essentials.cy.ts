/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX } from '../../../../screens/create_new_rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { selectThresholdRuleType } from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe(
  'Threshold rules, Serverless essentials license',
  {
    tags: ['@serverless'],

    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      visit(CREATE_RULE_URL);
    });

    it('Alert suppression is enabled for essentials', () => {
      selectThresholdRuleType();

      cy.get(THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX).should('be.enabled');
    });
  }
);
