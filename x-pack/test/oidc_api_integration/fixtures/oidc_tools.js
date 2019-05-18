/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import url from 'url';

export function getStateAndNonce(urlWithStateAndNonce) {
  const parsedQuery = url.parse(urlWithStateAndNonce, true).query;
  return { state: parsedQuery.state, nonce: parsedQuery.nonce };
}
