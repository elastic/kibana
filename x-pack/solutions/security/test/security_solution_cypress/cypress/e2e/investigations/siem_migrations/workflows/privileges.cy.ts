/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_PRIVILEGES_BOX } from '../../../../screens/common/page';
import {
  MISSING_PRIVILEGES_CALLOUT,
  UPLOAD_WORKFLOWS_BTN,
} from '../../../../screens/siem_migrations';
import { suppressGlobalAnnouncements } from '../../../../tasks/api_calls/suppress_global_announcements';
import { visit } from '../../../../tasks/navigation';
import { toggleMigrateWorkflowsCard } from '../../../../tasks/siem_migrations';
import { GET_STARTED_URL, TRANSLATED_WORKFLOWS_PAGE_URL } from '../../../../urls/navigation';
import { noWorkflowsRole } from '../common/role';

// TODO: https://github.com/elastic/kibana/issues/228940 remove @skipInServerlessMKI tag when privileges issue is fixed
describe(
  'Workflow Migrations - Privileges',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'tinesWorkflowsMigration',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      noWorkflowsRole.setup();
    });

    beforeEach(() => {
      noWorkflowsRole.login();
      suppressGlobalAnnouncements();
    });

    after(() => {
      noWorkflowsRole.teardown();
    });

    it('should show the missing privileges callout instead of the upload panel without Workflows read', () => {
      visit(`${GET_STARTED_URL}/siem_migrations`);
      toggleMigrateWorkflowsCard();

      cy.get(MISSING_PRIVILEGES_CALLOUT).should('contain.text', 'Workflows: Read');
      cy.get(UPLOAD_WORKFLOWS_BTN).should('not.exist');
    });

    it('should show the no privileges page for the translated workflows page without Workflows read', () => {
      visit(TRANSLATED_WORKFLOWS_PAGE_URL);

      cy.get(NO_PRIVILEGES_BOX).should('exist');
    });
  }
);
