/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '@kbn/security-solution-plugin/common/endpoint/service/response_actions/constants';
import { login } from '../../../tasks/login';
import { getAgentListTable, visitFleetAgentList } from '../../../screens';
import { getEndpointManagementPageMap } from '../../../screens/endpoint_management';
import { ensureResponseActionAuthzAccess } from '../../../tasks/endpoint_management';
import { SECURITY_ESSENTIALS_WITH_ENDPOINT_ESSENTIALS } from '../utils/product_types';

describe(
  'App Features for Security Essentials PLI with Endpoint Essentials Addon',
  {
    env: {
      ftrConfig: {
        productTypes: SECURITY_ESSENTIALS_WITH_ENDPOINT_ESSENTIALS,
      },
    },
  },
  () => {
    const allPages = getEndpointManagementPageMap();
    const allowedPages = [
      allPages.endpointList,
      allPages.policyList,
      allPages.trustedApps,
      allPages.blocklist,
      allPages.eventFilters,
    ];
    const deniedPages = [allPages.responseActionLog, allPages.hostIsolationExceptions];
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
        cy.getByTestSubj('noPrivilegesPage').should('exist');
      });
    }

    for (const actionName of RESPONSE_ACTION_API_COMMANDS_NAMES) {
      it(`should not allow access to Response Action: ${actionName}`, () => {
        ensureResponseActionAuthzAccess('none', actionName, username, password);
      });
    }

    it(`should have access to Fleet`, () => {
      visitFleetAgentList();
      getAgentListTable().should('exist');
    });
  }
);
