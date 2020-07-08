/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../../src/core/server';
import { createTokens } from '../../oidc_tools';

export function initRoutes(router: IRouter) {
  let nonce = '';
  router.get(
    {
      path: '/oidc_provider/authorize',
      validate: {
        query: schema.object(
          { redirect_uri: schema.string(), state: schema.string(), nonce: schema.string() },
          { unknowns: 'ignore' }
        ),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      nonce = request.query.nonce;

      return response.redirected({
        headers: {
          location: `${request.query.redirect_uri}?code=code1&state=${request.query.state}`,
        },
      });
    }
  );

  router.get(
    {
      path: '/oidc_provider/endsession',
      validate: {
        query: schema.object({ post_logout_redirect_uri: schema.string() }, { unknowns: 'ignore' }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      return response.redirected({
        headers: { location: request.query.post_logout_redirect_uri || '/' },
      });
    }
  );

  router.post(
    {
      path: '/api/oidc_provider/setup',
      validate: { body: (value) => ({ value }) },
      options: { authRequired: false },
    },
    (context, request, response) => {
      nonce = request.body.nonce;
      return response.ok({ body: {} });
    }
  );

  router.post(
    {
      path: '/api/oidc_provider/token_endpoint',
      validate: { body: (value) => ({ value }) },
      // Token endpoint needs authentication (with the client credentials) but we don't attempt to
      // validate this OIDC behavior here
      options: { authRequired: false, xsrfRequired: false },
    },
    (context, request, response) => {
      const userId = request.body.code.substring(4);
      const { accessToken, idToken } = createTokens(userId, nonce);
      return response.ok({
        body: {
          access_token: accessToken,
          token_type: 'Bearer',
          refresh_token: `valid-refresh-token${userId}`,
          expires_in: 3600,
          id_token: idToken,
        },
      });
    }
  );

  router.get(
    {
      path: '/api/oidc_provider/userinfo_endpoint',
      validate: false,
      options: { authRequired: false },
    },
    (context, request, response) => {
      const accessToken = (request.headers.authorization as string).substring(7);
      if (accessToken === 'valid-access-token1') {
        return response.ok({
          body: {
            sub: 'user1',
            name: 'Tony Stark',
            given_name: 'Tony',
            family_name: 'Stark',
            preferred_username: 'ironman',
            email: 'ironman@avengers.com',
          },
        });
      }

      if (accessToken === 'valid-access-token2') {
        return response.ok({
          body: {
            sub: 'user2',
            name: 'Peter Parker',
            given_name: 'Peter',
            family_name: 'Parker',
            preferred_username: 'spiderman',
            email: 'spiderman@avengers.com',
          },
        });
      }

      if (accessToken === 'valid-access-token3') {
        return response.ok({
          body: {
            sub: 'user3',
            name: 'Bruce Banner',
            given_name: 'Bruce',
            family_name: 'Banner',
            preferred_username: 'hulk',
            email: 'hulk@avengers.com',
          },
        });
      }

      return response.ok({ body: {} });
    }
  );
}
