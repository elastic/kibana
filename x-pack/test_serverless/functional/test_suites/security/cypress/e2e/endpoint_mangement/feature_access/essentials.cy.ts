/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { getEndpointManagementPageList } from '../../../lib';

describe(
  'Security Essential PLI',
  {
    env: {
      ftrConfig: {
        productTypes: [{ product_line: 'security', product_tier: 'essentials' }],
      },
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
        cy.getByTestSubj('noPrivilegesPage').should('exist');
      });
    }
  }
);
