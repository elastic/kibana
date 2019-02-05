/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import url from "url";

export function getStateAndNonce(urlWithStateAndNonce) {
  const stateValue = url.parse(urlWithStateAndNonce, true).query.state;
  const nonceValue = url.parse(urlWithStateAndNonce, true).query.nonce;
  return { state: stateValue, nonce: nonceValue };
}
