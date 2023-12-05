/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { createRule } from '../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';

/*
 *
 * Alert table is third party component which cannot be easily tested by jest.
 * This test main checks if Alert Table does not call api/lists/index more than once.
 *
 * */

describe('Alert Table API calls', { tags: ['@ess', '@serverless'] }, () => {
  let callCount: number = 0;

  beforeEach(() => {
    callCount = 0;
    login();
    createRule(getNewRule());
    // intercept all calls to `api/lists/index`
    // and count how many times it was called
    cy.intercept('GET', '/api/lists/index', (req) => {
      req.on('response', (res) => {
        if (res.statusCode === 200) {
          callCount += 1;
        }
      });
    });

    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('should call `api/lists/index` only once', () => {
    cy.get('[data-test-subj="alertsTable"]').then(() => {
      expect(callCount, 'number of times lists index api is called').to.equal(1);
    });
  });
});
