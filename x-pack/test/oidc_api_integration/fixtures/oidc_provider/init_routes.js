/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { createTokens } from '../oidc_tools';

export function initRoutes(server) {
  let nonce = '';

  server.route({
    path: '/api/oidc_provider/setup',
    method: 'POST',
    config: {
      auth: false,
      validate: {
        payload: Joi.object({
          nonce: Joi.string().required(),
        }),
      },
    },
    handler: request => {
      nonce = request.payload.nonce;
      return {};
    },
  });

  server.route({
    path: '/api/oidc_provider/token_endpoint',
    method: 'POST',
    // Token endpoint needs authentication (with the client credentials) but we don't attempt to
    // validate this OIDC behavior here
    config: {
      auth: false,
      validate: {
        payload: Joi.object({
          grant_type: Joi.string().optional(),
          code: Joi.string().optional(),
          redirect_uri: Joi.string().optional(),
        }),
      },
    },
    async handler(request) {
      const userId = request.payload.code.substring(4);
      const { accessToken, idToken } = createTokens(userId, nonce);
      try {
        const userId = request.payload.code.substring(4);
        return {
          access_token: accessToken,
          token_type: 'Bearer',
          refresh_token: `valid-refresh-token${userId}`,
          expires_in: 3600,
          id_token: idToken,
        };
      } catch (err) {
        return err;
      }
    },
  });

  server.route({
    path: '/api/oidc_provider/userinfo_endpoint',
    method: 'GET',
    config: {
      auth: false,
    },
    handler: request => {
      const accessToken = request.headers.authorization.substring(7);
      if (accessToken === 'valid-access-token1') {
        return {
          sub: 'user1',
          name: 'Tony Stark',
          given_name: 'Tony',
          family_name: 'Stark',
          preferred_username: 'ironman',
          email: 'ironman@avengers.com',
        };
      }
      if (accessToken === 'valid-access-token2') {
        return {
          sub: 'user2',
          name: 'Peter Parker',
          given_name: 'Peter',
          family_name: 'Parker',
          preferred_username: 'spiderman',
          email: 'spiderman@avengers.com',
        };
      }
      if (accessToken === 'valid-access-token3') {
        return {
          sub: 'user3',
          name: 'Bruce Banner',
          given_name: 'Bruce',
          family_name: 'Banner',
          preferred_username: 'hulk',
          email: 'hulk@avengers.com',
        };
      }
      return {};
    },
  });
}
