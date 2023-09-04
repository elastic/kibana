/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from '../common';

const kibanaSettings = (body: Cypress.RequestBody) => {
  rootRequest({
    method: 'POST',
    url: 'internal/kibana/settings',
    body,
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
  });
};

const relatedIntegrationsBody = (status: boolean): Cypress.RequestBody => {
  return { changes: { 'securitySolution:showRelatedIntegrations': status } };
};

export const enableRelatedIntegrations = () => {
  kibanaSettings(relatedIntegrationsBody(true));
};

export const disableRelatedIntegrations = () => {
  kibanaSettings(relatedIntegrationsBody(false));
};

export const disableExpandableFlyout = () => {
  const body = { changes: { 'securitySolution:enableExpandableFlyout': false } };
  kibanaSettings(body);
};
