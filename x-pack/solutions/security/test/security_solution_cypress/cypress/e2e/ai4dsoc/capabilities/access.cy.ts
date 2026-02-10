/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ALERTS_SUMMARY_PROMPT, GET_STARTED_PAGE } from '../../../screens/ai_soc';
import {
  ALERT_SUMMARY_URL,
  ALERTS_URL,
  MAINTENANCE_WINDOW_URL,
  RULES_URL,
  STACK_RULES_URL,
} from '../../../urls/navigation';

const MANAGEMENT_PAGE_DESCRIPTION =
  'Manage data and indices, oversee rules and connectors, organize saved objects and files, and create API keys in a central location.';

describe('Capabilities', { tags: '@serverless' }, () => {
  const userRoles = [
    {
      name: 'Admin user',
      loginAs: 'admin',
      setup: () => {}, // No additional setup needed
      teardown: () => {}, // No teardown needed
    },
    {
      name: 'User with siem v1 role',
      loginAs: 'siemv1',
      setup: () => {
        cy.task('createServerlessCustomRole', {
          roleDescriptor: {
            elasticsearch: {
              indices: [{ names: ['*'], privileges: ['all'] }],
            },
            kibana: [
              {
                feature: { siem: ['all'], fleet: ['all'] },
                spaces: ['*'],
              },
            ],
          },
          roleName: 'siemv1',
        });
      },
      teardown: () => {
        cy.task('deleteServerlessCustomRole', 'siemv1');
      },
    },
    {
      name: 'User with siem v2 role',
      loginAs: 'siemV2',
      setup: () => {
        cy.task('createServerlessCustomRole', {
          roleDescriptor: {
            elasticsearch: {
              indices: [{ names: ['*'], privileges: ['all'] }],
            },
            kibana: [
              {
                feature: { siemV2: ['all'], fleet: ['all'] },
                spaces: ['*'],
              },
            ],
          },
          roleName: 'siemV2',
        });
      },
      teardown: () => {
        cy.task('deleteServerlessCustomRole', 'siemV2');
      },
    },
    {
      name: 'User with siem v3 role',
      loginAs: 'siemV3',
      setup: () => {
        cy.task('createServerlessCustomRole', {
          roleDescriptor: {
            elasticsearch: {
              indices: [{ names: ['*'], privileges: ['all'] }],
            },
            kibana: [
              {
                feature: { siemV3: ['all'], fleet: ['all'] },
                spaces: ['*'],
              },
            ],
          },
          roleName: 'siemV3',
        });
      },
      teardown: () => {
        cy.task('deleteServerlessCustomRole', 'siemV3');
      },
    },
    {
      name: 'User with siem v4 role',
      loginAs: 'siemV4',
      setup: () => {
        cy.task('createServerlessCustomRole', {
          roleDescriptor: {
            elasticsearch: {
              indices: [{ names: ['*'], privileges: ['all'] }],
            },
            kibana: [
              {
                feature: { siemV4: ['all'], fleet: ['all'] },
                spaces: ['*'],
              },
            ],
          },
          roleName: 'siemV4',
        });
      },
      teardown: () => {
        cy.task('deleteServerlessCustomRole', 'siemV4');
      },
    },
    {
      name: 'User with siem v5 role',
      loginAs: 'siemV5',
      setup: () => {
        cy.task('createServerlessCustomRole', {
          roleDescriptor: {
            elasticsearch: {
              indices: [{ names: ['*'], privileges: ['all'] }],
            },
            kibana: [
              {
                feature: { siemV5: ['all'], securitySolutionRulesV2: ['all'], fleet: ['all'] },
                spaces: ['*'],
              },
            ],
          },
          roleName: 'siemV5',
        });
      },
      teardown: () => {
        cy.task('deleteServerlessCustomRole', 'siemV5');
      },
    },
  ];

  // Iterate through each user role
  userRoles.forEach((role) => {
    describe(`${role.name} capabilities`, () => {
      before(() => role.setup());

      beforeEach(() => {
        login(role.loginAs);
      });

      after(() => role.teardown());

      // Individual test cases with clear descriptions
      it('should show alert summary prompt when visiting alert summary page', () => {
        visit(ALERT_SUMMARY_URL);
        cy.get(ALERTS_SUMMARY_PROMPT).should('exist');
      });

      it('should redirect from alerts to get started page', () => {
        visit(ALERTS_URL);
        cy.get(GET_STARTED_PAGE).should('exist');
      });

      it('should redirect from rules to get started page', () => {
        visit(RULES_URL);
        cy.get(GET_STARTED_PAGE).should('exist');
      });

      it('should redirect from stack rules to main management page', () => {
        visit(STACK_RULES_URL);
        cy.contains(MANAGEMENT_PAGE_DESCRIPTION).should('exist');
      });

      it('should redirect from maintenance window to main management page', () => {
        visit(MAINTENANCE_WINDOW_URL);
        cy.contains(MANAGEMENT_PAGE_DESCRIPTION).should('exist');
      });
    });
  });
});
