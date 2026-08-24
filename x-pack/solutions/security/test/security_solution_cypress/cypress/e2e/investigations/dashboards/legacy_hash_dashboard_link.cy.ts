/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteSavedObjects, importSavedObjects } from '../../../tasks/api_calls/saved_objects';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { activateSpace, getSpaceUrl } from '../../../tasks/space';
import { DASHBOARDS_URL } from '../../../urls/navigation';

const OSQUERY_MANAGER_DASHBOARDS_FIXTURE = 'cypress/dashboards/osquery_manager_dashboards.ndjson';

// Ids/titles come from the Osquery Manager integration's own saved objects, imported by
// OSQUERY_MANAGER_DASHBOARDS_FIXTURE. Both dashboards ship a markdown "Navigation" panel with
// legacy hash links, e.g. `[Compliance](#/dashboard/osquery_manager-69f5ae20-eb02-11e7-8f04-51231daa5b05)`.
const COMPLIANCE_PACK_DASHBOARD_ID = 'osquery_manager-69f5ae20-eb02-11e7-8f04-51231daa5b05';
const COMPLIANCE_PACK_DASHBOARD_TITLE = '[Osquery Manager] Compliance pack';
const OSSEC_ROOTKIT_PACK_DASHBOARD_ID = 'osquery_manager-c0a7ce90-f4aa-11e7-8647-534bb4c21040';
const OSSEC_ROOTKIT_PACK_DASHBOARD_TITLE = '[Osquery Manager] OSSEC rootkit pack';

describe('Legacy hash-based dashboard links', { tags: ['@ess', '@serverless'] }, () => {
  // `dashboard` is a multi-namespace-isolated saved object type, so Kibana tracks a global
  // "origin" per literal id. Deleting by whatever id importSavedObjects actually returns (rather
  // than assuming the literal fixture id) ensures the origin is fully released, so the
  // "non-default space" describe block below can re-import these same literal ids cleanly.
  let importedSavedObjects: Array<{ type: string; id: string }> = [];

  before(() => {
    importSavedObjects(OSQUERY_MANAGER_DASHBOARDS_FIXTURE).then((objects) => {
      importedSavedObjects = objects;
    });
  });

  after(() => {
    deleteSavedObjects(importedSavedObjects);
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

  it('forwards an expanded panel id segment', () => {
    const EXPANDED_PANEL_ID = 'some-panel-id';
    visit(
      `${DASHBOARDS_URL}/${OSSEC_ROOTKIT_PACK_DASHBOARD_ID}#/dashboard/${COMPLIANCE_PACK_DASHBOARD_ID}/${EXPANDED_PANEL_ID}`
    );

    cy.url().should(
      'include',
      `${DASHBOARDS_URL}/${COMPLIANCE_PACK_DASHBOARD_ID}/${EXPANDED_PANEL_ID}`
    );
    cy.location('hash').should('eq', '');
    cy.get('#dashboardTitle').should('contain', COMPLIANCE_PACK_DASHBOARD_TITLE);
  });
});

describe('Legacy hash-based dashboard links in a non-default space', { tags: ['@ess'] }, () => {
  const SPACE_ID = 'legacy-hash-dashboard-link-space';
  let importedSavedObjects: Array<{ type: string; id: string }> = [];

  before(() => {
    // The space must exist before anything can be imported into it; `activateSpace` is also
    // called per-test in `beforeEach` below, but that runs after this hook.
    activateSpace(SPACE_ID);
    importSavedObjects(OSQUERY_MANAGER_DASHBOARDS_FIXTURE, SPACE_ID).then((objects) => {
      importedSavedObjects = objects;
    });
  });

  after(() => {
    deleteSavedObjects(importedSavedObjects, SPACE_ID);
  });

  beforeEach(() => {
    login();
    activateSpace(SPACE_ID);
  });

  it('redirects to the linked dashboard within the same space instead of leaving a broken hash in the url', () => {
    visit(getSpaceUrl(SPACE_ID, `${DASHBOARDS_URL}/${OSSEC_ROOTKIT_PACK_DASHBOARD_ID}`));

    cy.contains('[data-test-subj="markdownBody"] a', 'Compliance', { timeout: 30000 }).click();

    const expectedPath = getSpaceUrl(SPACE_ID, `${DASHBOARDS_URL}/${COMPLIANCE_PACK_DASHBOARD_ID}`);
    cy.url().should('include', expectedPath);
    // Guards against the space+app basename being applied twice, e.g.
    // `/s/<space>/app/security/s/<space>/app/security/dashboards/<id>`.
    cy.url().should('not.include', `/s/${SPACE_ID}/app/security/s/${SPACE_ID}`);
    cy.location('hash').should('eq', '');
    cy.get('#dashboardTitle').should('contain', COMPLIANCE_PACK_DASHBOARD_TITLE);
  });

  it('redirects to the same dashboard when clicking its own legacy link', () => {
    visit(getSpaceUrl(SPACE_ID, `${DASHBOARDS_URL}/${OSSEC_ROOTKIT_PACK_DASHBOARD_ID}`));

    cy.contains('[data-test-subj="markdownBody"] a', 'OSSEC Rootkit', { timeout: 30000 }).click();

    const expectedPath = getSpaceUrl(
      SPACE_ID,
      `${DASHBOARDS_URL}/${OSSEC_ROOTKIT_PACK_DASHBOARD_ID}`
    );
    cy.url().should('include', expectedPath);
    cy.url().should('not.include', `/s/${SPACE_ID}/app/security/s/${SPACE_ID}`);
    cy.location('hash').should('eq', '');
    cy.get('#dashboardTitle').should('contain', OSSEC_ROOTKIT_PACK_DASHBOARD_TITLE);
  });
});
