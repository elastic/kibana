/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GCP_ORGANIZATION_ACCOUNT_TEST_ID,
  GCP_SINGLE_ACCOUNT_TEST_ID,
} from '../../screens/asset_inventory/onboarding_gcp';

export const selectAccountType = (accountType: 'single' | 'organization') => {
  const accountTypeSelector =
    accountType === 'single' ? GCP_SINGLE_ACCOUNT_TEST_ID : GCP_ORGANIZATION_ACCOUNT_TEST_ID;

  cy.get(accountTypeSelector).click();
};
