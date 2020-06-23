/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import base64url from 'base64url';
import { createHash } from 'crypto';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import url from 'url';

export function getStateAndNonce(urlWithStateAndNonce: string) {
  const parsedQuery = url.parse(urlWithStateAndNonce, true).query;
  return { state: parsedQuery.state as string, nonce: parsedQuery.nonce as string };
}

export function createTokens(userId: string, nonce: string) {
  const signingKey = fs.readFileSync(require.resolve('./jwks_private.pem'));
  const iat = Math.floor(Date.now() / 1000);

  const accessToken = `valid-access-token${userId}`;
  const accessTokenHashBuffer = createHash('sha256').update(accessToken).digest();

  return {
    accessToken,
    idToken: jwt.sign(
      JSON.stringify({
        iss: 'https://test-op.elastic.co',
        sub: `user${userId}`,
        aud: '0oa8sqpov3TxMWJOt356',
        nonce,
        exp: iat + 3600,
        iat,
        // See more details on `at_hash` at https://openid.net/specs/openid-connect-core-1_0.html#ImplicitIDToken
        at_hash: base64url(accessTokenHashBuffer.slice(0, accessTokenHashBuffer.length / 2)),
      }),
      signingKey,
      { algorithm: 'RS256' }
    ),
  };
}
