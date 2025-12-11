/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionList } from '../../../../../../objects/exception';
import { EXCEPTIONS_TABLE_SHOWING_LISTS } from '../../../../../../screens/exceptions';
import {
  createExceptionList,
  deleteExceptionLists,
} from '../../../../../../tasks/api_calls/exceptions';

import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';
import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';

describe(
  'Shared exception lists - serverless essentials tier only',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        // Endpoint tier is not set, because we are testing Essentials tier access to exception lists page
        // refer to https://github.com/elastic/security-team/issues/14921
        productTypes: [{ product_line: 'security', product_tier: 'essentials' }],
      },
    },
  },
  () => {
    beforeEach(() => {
      deleteExceptionLists();
      createExceptionList(getExceptionList());

      login();
      visit(EXCEPTIONS_URL);
    });

    it('Exception list pages should be accessible', () => {
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
    });
  }
);
