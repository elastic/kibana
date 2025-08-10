/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { STORED_SCRIPTS_URL } from '../../../urls/risk_score';

export const createStoredScript = (options: { id: string; script: {} }) => {
  return cy.request({
    method: 'put',
    url: `${STORED_SCRIPTS_URL}/create`,
    body: options,
    headers: {
      'kbn-xsrf': 'cypress-creds',
      'x-elastic-internal-origin': 'security-solution',
      'elastic-api-version': '1',
    },
  });
};

const deleteStoredScript = (id: string) => {
  return cy.request({
    method: 'delete',
    url: `${STORED_SCRIPTS_URL}/delete`,
    body: { id },
    failOnStatusCode: false,
    headers: {
      'kbn-xsrf': 'cypress-creds',
      'x-elastic-internal-origin': 'security-solution',
      [ELASTIC_HTTP_VERSION_HEADER]: '1',
    },
  });
};

export const deleteStoredScripts = async (scriptIds: string[]) => {
  await Promise.all(scriptIds.map((scriptId) => deleteStoredScript(scriptId)));
};
