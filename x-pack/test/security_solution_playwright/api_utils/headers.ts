/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';

export const getCommonHeaders = (additionalHeaders: Record<string, string> = {}) => {
  const username = process.env.ELASTICSEARCH_USERNAME || '';
  const password = process.env.ELASTICSEARCH_PASSWORD || '';
  const encodedCredentials = Buffer.from(`${username}:${password}`).toString('base64');

  return {
    'kbn-xsrf': 'cypress-creds',
    'x-elastic-internal-origin': 'security-solution',
    Authorization: `Basic ${encodedCredentials}`,
    ...additionalHeaders,
  };
};

export const getCommonHeadersWithApiVersion = () => {
  return getCommonHeaders({ 'elastic-api-version': INITIAL_REST_VERSION });
};
