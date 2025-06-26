/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export enum QueryKeys {
  FetchIndex = 'fetchIndex',
  FetchMapping = 'fetchMapping',
  FetchOnboardingToken = 'fetchOnboardingToken',
  FetchSearchIndicesStatus = 'fetchSearchIndicesStatus',
  FetchUserStartPrivileges = 'fetchUserStartPrivileges',
  SearchDocuments = 'searchDocuments',
}

export enum MutationKeys {
  SearchIndicesCreateIndex = 'searchIndicesCreateIndex',
  SearchIndicesDeleteDocument = 'searchIndicesDeleteDocument',
}

export const ELASTICSEARCH_URL_PLACEHOLDER = 'https://your_deployment_url';
export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';
export const INDEX_PLACEHOLDER = 'my-index';

export const DEFAULT_DOCUMENT_PAGE_SIZE = 10;

export const BREADCRUMB_TEXT = i18n.translate('xpack.searchIndices.indexManagement.breadcrumb', {
  defaultMessage: 'Build',
});

export const PARENT_BREADCRUMB = {
  text: BREADCRUMB_TEXT,
};
