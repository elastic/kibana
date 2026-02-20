/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { deleteAllExceptionLists } from '../../../../common/detection_engine_api_helpers';
import { createRuleFromParams } from '../../../../common/rule_api_helpers';
import { getNewRule } from '../../../../common/rule_objects';

test.describe('Add/edit exception from rule details', {
  tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
}, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    await deleteAlertsAndRules(apiServices);
    await deleteAllExceptionLists(kbnClient);
  });

  test.describe('existing list and items', () => {
    test.skip('Edits an exception item', async () => {
      // Needs: createExceptionList, createExceptionListItem, createRule with exceptions_list
    });

    test.describe('rule with existing shared exceptions', () => {
      test.skip('Creates an exception item to add to shared list', async () => {});
      test.skip('Creates an exception item to add to rule only', async () => {});
      test.skip('Can search for items', async () => {});
    });
  });

  test.describe('rule without existing exceptions', () => {
    test.skip('Cannot create an item to add to rule but not shared list as rule has no lists attached', async () => {
      // Needs: esArchiver exceptions, exceptions_2
    });
  });
});
