/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '@kbn/security-solution-plugin/common/endpoint/service/response_actions/constants';
import { login } from '../../../tasks/login';
import { getAgentListTable, visitFleetAgentList } from '../../../screens';
import { getEndpointManagementPageList } from '../../../screens/endpoint_management';
import { ensureResponseActionAuthzAccess } from '../../../tasks/endpoint_management';
import { SECURITY_COMPLETE_WITH_ENDPOINT_COMPLETE } from '../utils/product_types';

describe(
  'App Features for Security Complete PLI with Endpoint Complete Addon',
  {
    env: {
      ftrConfig: {
        productTypes: SECURITY_COMPLETE_WITH_ENDPOINT_COMPLETE,
      },
    },
  },
  () => {
    const allPages = getEndpointManagementPageList();
    let username: string;
    let password: string;

    beforeEach(() => {
      login('endpoint_operations_analyst').then((response) => {
        username = response.username;
        password = response.password;
      });
    });

    for (const { url, title, pageTestSubj } of allPages) {
      it(`should allow access to ${title}`, () => {
        cy.visit(url);
        cy.getByTestSubj(pageTestSubj).should('exist');
      });
    }

    for (const actionName of RESPONSE_ACTION_API_COMMANDS_NAMES) {
      it(`should allow access to Response Action: ${actionName}`, () => {
        ensureResponseActionAuthzAccess('all', actionName, username, password);
      });
    }

    it(`should have access to Fleet`, () => {
      visitFleetAgentList();
      getAgentListTable().should('exist');
    });
  }
);
