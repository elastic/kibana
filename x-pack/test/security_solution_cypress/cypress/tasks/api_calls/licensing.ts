/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '@kbn/license-management-plugin/common/constants';

export const startBasicLicense = () =>
  cy.request({
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    method: 'POST',
    url: `${API_BASE_PATH}/start_basic?acknowledge=true`,
  });
