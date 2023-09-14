/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '@kbn/security-solution-plugin/common/endpoint/service/response_actions/constants';
import { login } from '../../../tasks/login';
import { getNoPrivilegesPage } from '../../../screens/endpoint_management/common';
import { ensureResponseActionAuthzAccess } from '../../../tasks/endpoint_management';
import { getEndpointManagementPageList } from '../../../screens/endpoint_management';

describe(
  'App Features for Security Essential PLI',
  {
    env: {
      ftrConfig: {
        productTypes: [{ product_line: 'security', product_tier: 'essentials' }],
      },
    },
  },
  () => {
    const allPages = getEndpointManagementPageList();
    const deniedPages = allPages.filter(({ id }) => {
      return id !== 'endpointList' && id !== 'policyList';
    });
    const allowedPages = allPages.filter(({ id }) => {
      return id === 'endpointList' || id === 'policyList';
    });
    let username: string;
    let password: string;

    beforeEach(() => {
      login('endpoint_operations_analyst').then((response) => {
        username = response.username;
        password = response.password;
      });
    });

    for (const { url, title, pageTestSubj } of allowedPages) {
      it(`should allow access to ${title}`, () => {
        cy.visit(url);
        cy.getByTestSubj(pageTestSubj).should('exist');
      });
    }

    for (const { url, title } of deniedPages) {
      it(`should NOT allow access to ${title}`, () => {
        cy.visit(url);
        getNoPrivilegesPage().should('exist');
      });
    }

    // No access to response actions (except `unisolate`)
    for (const actionName of RESPONSE_ACTION_API_COMMANDS_NAMES.filter(
      (apiName) => apiName !== 'unisolate'
    )) {
      it(`should not allow access to Response Action: ${actionName}`, () => {
        ensureResponseActionAuthzAccess('none', actionName, username, password);
      });
    }

    it('should have access to `unisolate` api', () => {
      ensureResponseActionAuthzAccess('all', 'unisolate', username, password);
    });
  }
);
