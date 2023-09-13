/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GetAPIKeysResult } from '@kbn/security-plugin/server/routes/api_keys/get';
import { request } from './request';

export const deleteApiKeys = () => {
  const baseUrl = Cypress.config().baseUrl;

  cy.log('Clearing all user API keys');

  return request<GetAPIKeysResult>({ url: `${baseUrl}/internal/security/api_key` }).then(
    (apiKeysResp) => {
      if (apiKeysResp.body.apiKeys.length === 0) {
        cy.log('No api keys found to delete');
        return;
      }

      if (!apiKeysResp.body.canManageApiKeys) {
        throw new Error('User cannot delete api keys');
      }
      const apiKeys = apiKeysResp.body.apiKeys.map(({ id, name }) => ({ id, name }));
      return request({
        url: `${baseUrl}/internal/security/api_key/invalidate`,
        method: 'POST',
        body: {
          apiKeys,
          isAdmin: true,
        },
      }).then((deleteResp) => {
        expect(deleteResp.status).to.eq(200);
      });
    }
  );
};
