/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_MESSAGE } from '../../../../screens/ai_assistant';
import { updateDateRangeInLocalDatePickers } from '../../../../tasks/date_picker';
import { DISCOVER_CONTAINER, DISCOVER_RESULT_HITS } from '../../../../screens/discover';
import { submitDiscoverSearchBar } from '../../../../tasks/discover';
import { goToEsqlTab, openActiveTimeline } from '../../../../tasks/timeline';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';
import { createAzureConnector } from '../../../../tasks/api_calls/connectors';
import { openAssistant, typeAndSendMessage } from '../../../../tasks/assistant';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';
const ESQL_QUERY = 'from auditbeat-* | where ecs.version == "8.0.0"';
const KQL_QUERY = '_index : "auditbeat-*" and ecs.version : "8.0.0"';
const EQL_QUERY = 'process where process.name == "zsh"';

// Failing: See https://github.com/elastic/kibana/issues/180756
describe(
  'Basic Assistant tests',
  {
    tags: ['@ess'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.actions.preconfigured=${JSON.stringify({
            'preconfigured-openai': {
              name: 'preconfigured-openai',
              actionTypeId: '.gen-ai',
              config: {
                apiProvider: 'OpenAI',
                apiUrl: 'https://api.openai.com/v1/chat/completions',
                defaultModel: 'gpt-4',
              },
              secrets: {
                apiKey: 'superlongapikey',
              },
            },
          })}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      openAssistant();
      createAzureConnector();
    });

    describe('ES|QL', () => {
      beforeEach(() => {
        login();
        visitWithTimeRange(ALERTS_URL);
        openAssistant();
        const message =
          'Below is an `Elasticsearch Query Language` query:' +
          '{shift}{enter}' +
          '```esql' +
          '{shift}{enter}' +
          `${ESQL_QUERY} | limit 1` +
          '{shift}{enter}' +
          '```';

        typeAndSendMessage(message);
        cy.get(CONVERSATION_MESSAGE).eq(0).should('exist');
        visitWithTimeRange(ALERTS_URL);
      });

      it('should properly propagate esql query to discover when Timeline was not opened before', () => {
        openAssistant();
        cy.get('[data-test-subj="messageText"]')
          .find('button[aria-label="Investigate in timeline"]')
          .click();
        cy.contains('[data-test-subj="kibanaCodeEditor"]', `${ESQL_QUERY} | limit 1`);
        updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
        submitDiscoverSearchBar();
        cy.get(DISCOVER_RESULT_HITS).should('have.text', 1);
      });

      it('should properly propagate esql query to discover when Timeline is active', () => {
        openActiveTimeline();
        goToEsqlTab();
        openAssistant();
        cy.get('[data-test-subj="messageText"]')
          .find('button[aria-label="Investigate in timeline"]')
          .click();
        cy.contains('[data-test-subj="kibanaCodeEditor"]', `${ESQL_QUERY} | limit 1`);
        updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
        submitDiscoverSearchBar();
        cy.get(DISCOVER_RESULT_HITS).should('have.text', 1);
      });
    });

    describe('KQL', () => {
      beforeEach(() => {
        login();
        visitWithTimeRange(ALERTS_URL);
        openAssistant();
      });

      it('should properly propagate KQL query', () => {
        cy.get('[data-test-subj="prompt-textarea"]').type(
          'Below is an `Elasticsearch Query Language` query:' +
            '{shift}{enter}' +
            '```kql' +
            '{shift}{enter}' +
            `${KQL_QUERY}` +
            '{shift}{enter}' +
            '```'
        );
        cy.get('[data-test-subj="submit-chat"]').click();
        cy.get('[data-test-subj="messageText"]')
          .find('button[aria-label="Investigate in timeline"]')
          .click();
        cy.contains('[data-test-subj="timelineQueryInput"]', KQL_QUERY);
        cy.get('[data-test-subj="superDatePickerApplyTimeButton"]').filter(':visible').click();
        cy.get('[data-grid-row-index]').filter(':visible').should('have.length', 1);
      });
    });

    describe('EQL', () => {
      beforeEach(() => {
        login();
        visitWithTimeRange(ALERTS_URL);
        openAssistant();
      });

      it('should properly propagate EQL query', () => {
        cy.get('[data-test-subj="prompt-textarea"]').type(
          'Below is an `Elasticsearch Query Language` query:' +
            '{shift}{enter}' +
            '```eql' +
            '{shift}{enter}' +
            `${EQL_QUERY}` +
            '{shift}{enter}' +
            '```'
        );
        cy.get('[data-test-subj="submit-chat"]').click();
        cy.get('[data-test-subj="messageText"]')
          .find('button[aria-label="Investigate in timeline"]')
          .click();
        cy.contains('[data-test-subj="eqlQueryBarTextInput"]', `${EQL_QUERY}`);
        cy.get('[data-test-subj="superDatePickerApplyTimeButton"]').filter(':visible').click();
        cy.get('[data-grid-row-index]').filter(':visible').should('have.length', 1);
      });
    });
  }
);
