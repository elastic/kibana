/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';

import { ALERTS_URL, CREATE_RULE_URL } from '../../../urls/navigation';
import { RULES_MANAGEMENT_URL } from '../../../urls/rules_management';
import { ABSOLUTE_DATE_RANGE } from '../../../urls/state';
import {
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  GET_DATE_PICKER_END_DATE_POPOVER_BUTTON,
} from '../../../screens/date_picker';
import { ruleDetailsUrl } from '../../../urls/rule_details';
import { editRuleUrl } from '../../../urls/edit_rule';

const LEGACY_DETECTIONS_URL_1 = '/app/siem#/detections';
const LEGACY_DETECTIONS_URL_2 = '/app/security/detections';
const LEGACY_DETECTIONS_RULES_URL = '/app/security/detections/rules';
const LEGACY_DETECTIONS_CREATE_RULE_URL = '/app/security/detections/rules/create';
const legacyRuleDetailsUrl = (ruleId: string) => `app/security/detections/rules/id/${ruleId}`;
const legacyRuleEditUrl = (ruleId: string) => `app/security/detections/rules/id/${ruleId}/edit`;

const ABSOLUTE_DATE = {
  endTime: 'Aug 1, 2019 @ 20:33:29.186',
  startTime: 'Aug 1, 2019 @ 20:03:29.186',
};

const RULE_ID = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';

describe('URL compatibility', { tags: ['@ess', '@skipInServerless'] }, () => {
  beforeEach(() => {
    login();
  });

  it('Redirects to alerts from old siem Detections URL', () => {
    visit(LEGACY_DETECTIONS_URL_1);
    cy.url().should('include', ALERTS_URL);
  });

  it('Redirects to alerts from old Detections URL', () => {
    visit(LEGACY_DETECTIONS_URL_2);
    cy.url().should('include', ALERTS_URL);
  });

  it('Redirects to rules from old Detections rules URL', () => {
    visit(LEGACY_DETECTIONS_RULES_URL);
    cy.url().should('include', RULES_MANAGEMENT_URL);
  });

  it('Redirects to rules creation from old Detections rules creation URL', () => {
    visit(LEGACY_DETECTIONS_CREATE_RULE_URL);
    cy.url().should('include', CREATE_RULE_URL);
  });

  it('Redirects to rule details from old Detections rule details URL', () => {
    visit(legacyRuleDetailsUrl(RULE_ID));
    cy.url().should('include', ruleDetailsUrl(RULE_ID));
  });

  it('Redirects to rule details alerts tab from old Detections rule details URL', () => {
    visit(legacyRuleDetailsUrl(RULE_ID));
    cy.url().should('include', ruleDetailsUrl(RULE_ID, 'alerts'));
  });

  it('Redirects to rule edit from old Detections rule edit URL', () => {
    visit(legacyRuleEditUrl(RULE_ID));
    cy.url().should('include', editRuleUrl(RULE_ID));
  });

  it('sets the global start and end dates from the url with timestamps', () => {
    visit(ABSOLUTE_DATE_RANGE.urlWithTimestamps);
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTime
    );
    cy.get(GET_DATE_PICKER_END_DATE_POPOVER_BUTTON()).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTime
    );
  });
});
