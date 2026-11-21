/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKFLOWS_UI_DISABLED_CALLOUT } from '../../../../screens/siem_migrations';
import { suppressGlobalAnnouncements } from '../../../../tasks/api_calls/suppress_global_announcements';
import { visit } from '../../../../tasks/navigation';
import { toggleMigrateWorkflowsCard } from '../../../../tasks/siem_migrations';
import { GET_STARTED_URL, TRANSLATED_WORKFLOWS_PAGE_URL } from '../../../../urls/navigation';
import { role } from '../common/role';

// TODO: https://github.com/elastic/kibana/issues/228940 remove @skipInServerlessMKI tag when privileges issue is fixed
describe(
  'Workflow Migrations - Workflows turned off',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'tinesWorkflowsMigration',
          ])}`,
          '--uiSettings.overrides.workflows:ui:enabled=false',
        ],
      },
    },
  },
  () => {
    before(() => {
      role.setup();
    });

    beforeEach(() => {
      role.login();
      suppressGlobalAnnouncements();
    });

    after(() => {
      role.teardown();
    });

    it('should explain that Workflows is turned off in the Manage automatic migrations card', () => {
      visit(`${GET_STARTED_URL}/siem_migrations`);
      toggleMigrateWorkflowsCard();

      cy.get(WORKFLOWS_UI_DISABLED_CALLOUT).should('exist');
    });

    it('should not open the translated workflows page', () => {
      visit(TRANSLATED_WORKFLOWS_PAGE_URL);

      cy.location('pathname').should('not.contain', 'siem_migrations/workflows');
    });
  }
);
