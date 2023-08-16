/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../../tags';

import { getIndexConnector } from '../../../objects/connector';
import { getSimpleCustomQueryRule } from '../../../objects/rule';

import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { deleteIndex, waitForNewDocumentToBeIndexed } from '../../../tasks/api_calls/elasticsearch';
import {
  cleanKibana,
  deleteAlertsAndRules,
  deleteConnectors,
  deleteDataView,
} from '../../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleAndContinue,
  fillRuleAction,
  fillScheduleRuleAndContinue,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';

import { RULE_CREATION } from '../../../urls/navigation';

describe(
  'Rule actions during detection rule creation',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    const indexConnector = getIndexConnector();

    before(() => {
      cleanKibana();
    });

    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      deleteConnectors();
      deleteIndex(indexConnector.index);
      deleteDataView(indexConnector.index);
    });

    const rule = getSimpleCustomQueryRule();
    const actions = { connectors: [indexConnector] };
    const index = actions.connectors[0].index;
    const initialNumberOfDocuments = 0;
    const expectedJson = JSON.parse(actions.connectors[0].document);

    it('Indexes a new document after the index action is triggered ', function () {
      visit(RULE_CREATION);
      fillDefineCustomRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      fillRuleAction(actions);
      createAndEnableRule();
      goToRuleDetails();

      /* When the rule is executed, the action is triggered. We wait for the new document to be indexed */
      waitForNewDocumentToBeIndexed(index, initialNumberOfDocuments);

      /* We assert that the new indexed document is the one set on the index action */
      cy.request({
        method: 'GET',
        url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_search`,
        headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
      }).then((response) => {
        expect(response.body.hits.hits[0]._source).to.deep.equal(expectedJson);
      });
    });
  }
);
