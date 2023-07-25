/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { getNoPrivilegesPage } from '../../../screens/endpoint_management/common';
import { getEndpointManagementPageList } from '../../../screens/endpoint_management';

describe(
  'App Features for Complete PLI',
  {
    env: {
      ftrConfig: { productTypes: [{ product_line: 'security', product_tier: 'complete' }] },
    },
  },
  () => {
    const pages = getEndpointManagementPageList();

    beforeEach(() => {
      login();
    });

    for (const { url, title } of pages) {
      it(`should not allow access to ${title}`, () => {
        cy.visit(url);
        getNoPrivilegesPage().should('exist');
      });
    }
  }
);
