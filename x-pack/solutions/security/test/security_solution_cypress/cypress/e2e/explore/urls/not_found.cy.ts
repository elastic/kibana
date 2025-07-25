/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import {
  ALERTS_URL,
  ENDPOINTS_URL,
  TRUSTED_APPS_URL,
  EVENT_FILTERS_URL,
  TIMELINES_URL,
  EXCEPTIONS_URL,
  CREATE_RULE_URL,
} from '../../../urls/navigation';
import { RULES_MANAGEMENT_URL } from '../../../urls/rules_management';

import { NOT_FOUND } from '../../../screens/common/page';
import { ruleDetailsUrl } from '../../../urls/rule_details';
import { editRuleUrl } from '../../../urls/edit_rule';

const mockRuleId = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';

describe('Display not found page', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    visitWithTimeRange(TIMELINES_URL);
  });

  it('navigates to the alerts page with incorrect link', () => {
    visitWithTimeRange(`${ALERTS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the exceptions page with incorrect link', () => {
    visitWithTimeRange(`${EXCEPTIONS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the rules page with incorrect link', () => {
    visitWithTimeRange(`${RULES_MANAGEMENT_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the rules creation page with incorrect link', () => {
    visitWithTimeRange(`${CREATE_RULE_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the rules details page with incorrect link', () => {
    visitWithTimeRange(`${ruleDetailsUrl(mockRuleId)}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the edit rules page with incorrect link', () => {
    visitWithTimeRange(`${editRuleUrl(mockRuleId)}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the endpoints page with incorrect link', () => {
    visitWithTimeRange(`${ENDPOINTS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the trusted applications page with incorrect link', () => {
    visitWithTimeRange(`${TRUSTED_APPS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the event filters page with incorrect link', () => {
    visitWithTimeRange(`${EVENT_FILTERS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });
});
