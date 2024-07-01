// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

const namespace = 'elastic-system';
const USAGE_SERVICE_BASE_API_URL = `https://usage-api.${namespace}/api`;

const USAGE_SERVICE_BASE_API_URL_V1 = `${USAGE_SERVICE_BASE_API_URL}/v1`;

export const USAGE_SERVICE_USAGE_URL = `${USAGE_SERVICE_BASE_API_URL_V1}/usage`;
let interceptedRequestBody: any = null;

// const foo = 'https://usage-api.elastic-system/api/v1/usage ';
const fooUrl = '/use';

import { http, HttpResponse } from 'msw';

export const usageAPIHandler = http.post(fooUrl, async ({ request }) => {
  // const response = await fetch(request);
  console.log('A new request has been made');
  const payload = await request.clone().text();
  console.log(await request.clone().text());
  interceptedRequestBody = payload;
  return HttpResponse.json({ name: payload });
});

export const getInterceptedRequestBody = () => interceptedRequestBody;
