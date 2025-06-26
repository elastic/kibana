/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum QueryKeys {
  FetchIndex = 'fetchIndex',
  FetchMapping = 'fetchMapping',
  FetchOnboardingToken = 'fetchOnboardingToken',
  FetchSearchIndicesStatus = 'fetchSearchIndicesStatus',
  FetchUserStartPrivileges = 'fetchUserStartPrivileges',
  SearchDocuments = 'searchDocuments',
  ApiKey = 'apiKey',
}

export const ELASTICSEARCH_URL_PLACEHOLDER = 'https://your_deployment_url';
