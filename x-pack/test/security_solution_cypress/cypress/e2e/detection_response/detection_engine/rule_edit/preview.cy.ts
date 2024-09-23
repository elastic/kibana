/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule, getSimpleCustomQueryRule } from '../../../../objects/rule';

import {
  PREVIEW_LOGGED_REQUEST_DESCRIPTION,
  PREVIEW_LOGGED_REQUEST_CODE_BLOCK,
  PREVIEW_LOGGED_REQUESTS_CHECKBOX,
  RULES_CREATION_PREVIEW_REFRESH_BUTTON,
} from '../../../../screens/create_new_rule';

import { createRule } from '../../../../tasks/api_calls/rules';

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  checkEnableLoggedRequests,
  submitRulePreview,
  toggleLoggedRequestsAccordion,
  toggleLoggedRequestsItemAccordion,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';

import { visitEditRulePage } from '../../../../tasks/edit_rule';

const expectedValidEsqlQuery = 'from auditbeat* METADATA _id';

describe(
  'Detection rules, preview',
  {
    // Currently FF are not supported on MKI environments, so this test should be skipped from MKI environments.
    // Once `manualRuleRunEnabled` FF is removed, we can remove `@skipInServerlessMKI` as well
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      kbnServerArgs: [
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(['loggingRequestsEnabled'])}`,
      ],
    },
  },
  () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
    });

    describe('supports preview logged requests', () => {
      beforeEach(() => {
        createRule({ ...getEsqlRule(), query: expectedValidEsqlQuery }).then((createdRule) => {
          visitEditRulePage(createdRule.body.id);
        });
      });

      it('shows preview logged requests', () => {
        checkEnableLoggedRequests();
        submitRulePreview();

        toggleLoggedRequestsAccordion();
        toggleLoggedRequestsItemAccordion();

        cy.get(PREVIEW_LOGGED_REQUEST_DESCRIPTION)
          .first()
          .contains('ES|QL request to find all matches');

        cy.get(PREVIEW_LOGGED_REQUEST_CODE_BLOCK).first().contains(expectedValidEsqlQuery);
      });
    });

    describe('does not support preview logged requests', () => {
      beforeEach(() => {
        createRule(getSimpleCustomQueryRule()).then((createdRule) => {
          visitEditRulePage(createdRule.body.id);
        });
      });

      it('does not show preview logged requests checkbox', () => {
        cy.get(RULES_CREATION_PREVIEW_REFRESH_BUTTON).should('be.visible');
        cy.get(PREVIEW_LOGGED_REQUESTS_CHECKBOX).should('not.exist');
      });
    });
  }
);
