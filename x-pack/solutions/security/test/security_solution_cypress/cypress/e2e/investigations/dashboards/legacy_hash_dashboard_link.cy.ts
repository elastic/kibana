/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDocument, deleteDataStream } from '../../../tasks/api_calls/elasticsearch';
import { deleteSavedObjects, importSavedObjects } from '../../../tasks/api_calls/saved_objects';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { DASHBOARDS_URL } from '../../../urls/navigation';

const OSQUERY_MANAGER_DASHBOARDS_FIXTURE = 'cypress/dashboards/osquery_manager_dashboards.ndjson';

// The imported dashboards' search panels are backed by the "logs-*" data view. With zero
// matching indices, Kibana fails to resolve any fields for it, which crashes the dashboard
// app on load. Indexing a doc auto-creates a "logs-*" data stream (per the built-in "logs"
// index template), giving the data view fields to resolve and avoiding that crash.
const SEED_LOGS_DATA_STREAM = 'logs-cypress_legacy_hash_dashboard_link-default';

// Ids/titles come from the Osquery Manager integration's own saved objects, imported by
// OSQUERY_MANAGER_DASHBOARDS_FIXTURE. Both dashboards ship a markdown "Navigation" panel with
// legacy hash links, e.g. `[Compliance](#/dashboard/osquery_manager-69f5ae20-eb02-11e7-8f04-51231daa5b05)`.
const COMPLIANCE_PACK_DASHBOARD_ID = 'osquery_manager-69f5ae20-eb02-11e7-8f04-51231daa5b05';
const COMPLIANCE_PACK_DASHBOARD_TITLE = '[Osquery Manager] Compliance pack';
const OSSEC_ROOTKIT_PACK_DASHBOARD_ID = 'osquery_manager-c0a7ce90-f4aa-11e7-8647-534bb4c21040';
const OSSEC_ROOTKIT_PACK_DASHBOARD_TITLE = '[Osquery Manager] OSSEC rootkit pack';

const IMPORTED_SAVED_OBJECTS = [
  { type: 'dashboard', id: COMPLIANCE_PACK_DASHBOARD_ID },
  { type: 'dashboard', id: OSSEC_ROOTKIT_PACK_DASHBOARD_ID },
  { type: 'search', id: 'osquery_manager-0fe5dc00-f49b-11e7-8647-534bb4c21040' },
  { type: 'search', id: 'osquery_manager-3824b080-eb02-11e7-8f04-51231daa5b05' },
  { type: 'search', id: 'osquery_manager-7a9482d0-eb00-11e7-8f04-51231daa5b05' },
];

describe('Legacy hash-based dashboard links', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    createDocument(SEED_LOGS_DATA_STREAM, { '@timestamp': new Date().toISOString() });
    importSavedObjects(OSQUERY_MANAGER_DASHBOARDS_FIXTURE);
  });

  after(() => {
    deleteSavedObjects(IMPORTED_SAVED_OBJECTS);
    deleteDataStream(SEED_LOGS_DATA_STREAM);
  });

  beforeEach(() => {
    login();
  });

  it('redirects to the linked dashboard instead of leaving a broken hash in the url', () => {
    visit(`${DASHBOARDS_URL}/${OSSEC_ROOTKIT_PACK_DASHBOARD_ID}`);

    cy.contains('[data-test-subj="markdownBody"] a', 'Compliance', { timeout: 30000 }).click();

    cy.url().should('include', `${DASHBOARDS_URL}/${COMPLIANCE_PACK_DASHBOARD_ID}`);
    cy.location('hash').should('eq', '');
    cy.get('#dashboardTitle').should('contain', COMPLIANCE_PACK_DASHBOARD_TITLE);
  });

  it('redirects to the same dashboard when clicking its own legacy link', () => {
    visit(`${DASHBOARDS_URL}/${OSSEC_ROOTKIT_PACK_DASHBOARD_ID}`);

    cy.contains('[data-test-subj="markdownBody"] a', 'OSSEC Rootkit', { timeout: 30000 }).click();

    cy.url().should('include', `${DASHBOARDS_URL}/${OSSEC_ROOTKIT_PACK_DASHBOARD_ID}`);
    cy.location('hash').should('eq', '');
    cy.get('#dashboardTitle').should('contain', OSSEC_ROOTKIT_PACK_DASHBOARD_TITLE);
  });
});
