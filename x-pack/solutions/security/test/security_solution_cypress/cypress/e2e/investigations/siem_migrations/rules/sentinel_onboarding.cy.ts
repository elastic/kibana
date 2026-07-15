/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCHLISTS_UPLOAD_STEP } from '../../../../screens/siem_migrations';
import { deleteConnectors } from '../../../../tasks/api_calls/common';
import { createBedrockConnector } from '../../../../tasks/api_calls/connectors';
import { cleanMigrationData } from '../../../../tasks/api_calls/siem_migrations';
import { visit } from '../../../../tasks/navigation';
import {
  openUploadRulesFlyout,
  selectMigrationConnector,
  selectSentinelMigrationSource,
  setMigrationName,
  uploadSentinelRules,
  uploadSentinelWatchlist,
  selectSentinelWatchlistFile,
} from '../../../../tasks/siem_migrations';
import { MANAGE_AUTOMATIC_MIGRATIONS_URL } from '../../../../urls/navigation';
import { role } from '../common/role';

const SENTINEL_RULES_WITH_WATCHLIST = {
  resources: [
    {
      id: '/subscriptions/abc/resourceGroups/rg/providers/Microsoft.SecurityInsights/alertRules/rule-1',
      name: 'rule-1',
      kind: 'Scheduled',
      type: 'Microsoft.SecurityInsights/alertRules',
      properties: {
        displayName: 'Suspicious sign-in from watchlisted account',
        description: 'Detects sign-ins from accounts on the high-value watchlist',
        query: "SigninLogs | where AccountName in (_GetWatchlist('HighValueAccounts'))",
        severity: 'Medium',
        tactics: ['InitialAccess'],
        techniques: ['T1078'],
      },
    },
  ],
};

const SENTINEL_WATCHLIST = {
  $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
  contentVersion: '1.0.0.0',
  resources: [
    {
      type: 'Microsoft.OperationalInsights/workspaces/providers/Watchlists',
      properties: {
        watchlistAlias: 'HighValueAccounts',
        rawContent: 'AccountName,Description\r\nalice,High value user\r\nbob,High value admin',
        itemsSearchKey: 'AccountName',
        contentType: 'text/csv',
      },
    },
  ],
};

const UNSUPPORTED_CONTENT_TYPE_WATCHLIST = {
  ...SENTINEL_WATCHLIST,
  resources: [
    {
      ...SENTINEL_WATCHLIST.resources[0],
      properties: {
        ...SENTINEL_WATCHLIST.resources[0].properties,
        contentType: 'application/json',
      },
    },
  ],
};

const selectSentinelAndUploadRules = () => {
  selectSentinelMigrationSource();
  setMigrationName();
  uploadSentinelRules(SENTINEL_RULES_WITH_WATCHLIST);
};

const advanceToWatchlistFileUpload = () => {
  cy.get('[data-test-subj="watchlistNameCopy"]').first().click();
};

// TODO: https://github.com/elastic/kibana/issues/228940 remove @skipInServerlessMKI tag when privileges issue is fixed
describe(
  'Rule Migrations - Microsoft Sentinel watchlist workflow',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'sentinelRulesMigration',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      role.setup();
    });

    beforeEach(() => {
      deleteConnectors();
      createBedrockConnector();
      role.login();
      visit(`/${MANAGE_AUTOMATIC_MIGRATIONS_URL}`);
      selectMigrationConnector();
      openUploadRulesFlyout();
    });

    afterEach(() => {
      cleanMigrationData();
    });

    after(() => {
      role.teardown();
    });

    it('should identify missing watchlists from Microsoft Sentinel rules', () => {
      cy.intercept({ url: '**/sentinel/rules' }).as('createSentinelRules');

      selectSentinelAndUploadRules();

      cy.wait('@createSentinelRules').its('response.statusCode').should('eq', 200);
      cy.get(WATCHLISTS_UPLOAD_STEP.STEP_NUMBER).should('exist');
      cy.get(WATCHLISTS_UPLOAD_STEP.TITLE).should('contain.text', 'Upload watchlists');
      cy.contains('HighValueAccounts').should('be.visible');
    });

    it('should upload a valid Microsoft Sentinel watchlist', () => {
      cy.intercept({ url: '**/sentinel/rules' }).as('createSentinelRules');
      cy.intercept({ url: '**/resources' }).as('uploadWatchlist');

      selectSentinelAndUploadRules();
      cy.wait('@createSentinelRules').its('response.statusCode').should('eq', 200);
      advanceToWatchlistFileUpload();
      uploadSentinelWatchlist(SENTINEL_WATCHLIST);

      cy.wait('@uploadWatchlist').its('response.statusCode').should('eq', 200);
      cy.get('[data-test-subj="startMigrationButton"]').should('not.be.disabled');
    });

    it('should show an error for unsupported Microsoft Sentinel watchlist content types', () => {
      cy.intercept({ url: '**/sentinel/rules' }).as('createSentinelRules');
      cy.intercept({ url: '**/resources' }).as('uploadWatchlist');

      selectSentinelAndUploadRules();
      cy.wait('@createSentinelRules').its('response.statusCode').should('eq', 200);
      advanceToWatchlistFileUpload();
      uploadSentinelWatchlist(UNSUPPORTED_CONTENT_TYPE_WATCHLIST);

      cy.wait('@uploadWatchlist').its('response.statusCode').should('eq', 400);
      cy.contains('Unsupported Sentinel watchlist content type: application/json').should(
        'be.visible'
      );
    });

    it('should show an error for invalid Microsoft Sentinel watchlist JSON', () => {
      cy.intercept({ url: '**/sentinel/rules' }).as('createSentinelRules');

      selectSentinelAndUploadRules();
      cy.wait('@createSentinelRules').its('response.statusCode').should('eq', 200);
      advanceToWatchlistFileUpload();
      selectSentinelWatchlistFile('{invalid json');

      cy.contains('Sentinel watchlist must be valid JSON.').should('be.visible');
    });
  }
);
