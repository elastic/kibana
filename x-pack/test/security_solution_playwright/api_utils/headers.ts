/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { getApiKeyForUser } from './api_key';

export const getCommonHeaders = async (additionalHeaders: Record<string, string> = {}) => {
  let auth = '';

  if (process.env.IS_SERVERLESS === 'true') {
    const apiKey = await getApiKeyForUser();
    auth = `ApiKey ${apiKey}`;
  } else {
    const username = process.env.ELASTICSEARCH_USERNAME || '';
    const password = process.env.ELASTICSEARCH_PASSWORD || '';
    const encodedCredentials = Buffer.from(`${username}:${password}`).toString('base64');

    auth = `Basic ${encodedCredentials}`;
  }
  return {
    'kbn-xsrf': 'cypress-creds',
    'x-elastic-internal-origin': 'security-solution',
    Authorization: auth,
    ...additionalHeaders,
  };
};

export const getCommonHeadersWithApiVersion = async () => {
  const header = await getCommonHeaders({
    'elastic-api-version': INITIAL_REST_VERSION,
  });
  return header;
};
