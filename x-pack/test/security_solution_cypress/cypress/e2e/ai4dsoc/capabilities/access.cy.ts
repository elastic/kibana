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
  it('should display the alerts summary prompt when visiting the Alerts Summary page', () => {
    visit(ALERT_SUMMARY_URL);
    cy.get(ALERTS_SUMMARY_PROMPT).should('exist');
  });

  it('should redirect to Get Started page when visiting the Alerts page', () => {
    visit(ALERTS_URL);
    cy.get(GET_STARTED_PAGE).should('exist');
  });

  it('should redirect to Get Started page when visiting the Rules page', () => {
    visit(RULES_LANDING_URL);
    cy.get(GET_STARTED_PAGE).should('exist');
  });
};

describe('Capabilities', { tags: '@serverless' }, () => {
  describe('Admin user capabilities', () => {
    beforeEach(() => {
      login('admin');
    });

    describe('Page access checks', () => {
      testPageAccess();
    });
  });

  describe('User with siem v1 role', () => {
    const v1Role = {
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
        v1Role,
        roleName: 'siemv1',
      });
    });

    beforeEach(() => {
      login('siemv1');
    });

    after(() => {
      cy.task('deleteServerlessCustomRole', 'siemv1');
    });

    describe('Page access checks', () => {
      testPageAccess();
    });
  });

  describe('User with siem v2 role', () => {
    const v2Role = {
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
        v2Role,
        roleName: 'siemV2',
      });
    });

    beforeEach(() => {
      login('siemV2');
    });

    after(() => {
      cy.task('deleteServerlessCustomRole', 'siemV2');
    });

    describe('Page access checks', () => {
      testPageAccess();
    });
  });
});
