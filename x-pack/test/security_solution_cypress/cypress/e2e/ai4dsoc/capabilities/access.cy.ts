/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ALERTS_SUMMARY_PROMPT, GET_STARTED_PAGE } from '../constants';
import { ALERT_SUMMARY_URL, ALERTS_URL, RULES_LANDING_URL } from '../../../urls/navigation';

const testPageAccess = () => {
  it('should show page or redirect depending on capabilities', () => {
    visit(ALERT_SUMMARY_URL);
    cy.get(ALERTS_SUMMARY_PROMPT).should('exist');

    // should redirect out from alerts to get started page
    visit(ALERTS_URL);
    cy.get(GET_STARTED_PAGE).should('exist');

    // should redirect out from rules to get started page
    visit(RULES_LANDING_URL);
    cy.get(GET_STARTED_PAGE).should('exist');
  });
};

describe('Capabilities', { tags: '@serverless' }, () => {
  describe('Admin user capabilities', () => {
    beforeEach(() => {
      login('admin');
    });

    testPageAccess();
  });

  describe('User with siem v1 role', () => {
    const roleDescriptor = {
      elasticsearch: {
        indices: [
          {
            names: ['*'],
            privileges: ['all'],
          },
        ],
      },
      kibana: [
        {
          feature: {
            siem: ['all'],
            fleet: ['all'],
          },
          spaces: ['*'],
        },
      ],
    };

    before(() => {
      cy.task('createServerlessCustomRole', {
        roleDescriptor,
        roleName: 'siemv1',
      });
    });

    beforeEach(() => {
      login('siemv1');
    });

    after(() => {
      cy.task('deleteServerlessCustomRole', 'siemv1');
    });

    testPageAccess();
  });

  describe('User with siem v2 role', () => {
    const roleDescriptor = {
      elasticsearch: {
        indices: [
          {
            names: ['*'],
            privileges: ['all'],
          },
        ],
      },
      kibana: [
        {
          feature: {
            siemV2: ['all'],
            fleet: ['all'],
          },
          spaces: ['*'],
        },
      ],
    };

    before(() => {
      cy.task('createServerlessCustomRole', {
        roleDescriptor,
        roleName: 'siemV2',
      });
    });

    beforeEach(() => {
      login('siemV2');
    });

    after(() => {
      cy.task('deleteServerlessCustomRole', 'siemV2');
    });

    testPageAccess();
  });
});
