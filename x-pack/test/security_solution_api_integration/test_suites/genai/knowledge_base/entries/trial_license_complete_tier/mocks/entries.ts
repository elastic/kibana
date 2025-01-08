/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DocumentEntryCreateFields,
  DocumentEntryType,
  IndexEntryCreateFields,
  IndexEntryType,
} from '@kbn/elastic-assistant-common';

export const documentEntry: DocumentEntryCreateFields = {
  name: 'Sample Document Entry',
  type: DocumentEntryType.value,
  required: false,
  source: 'api',
  kbResource: 'user',
  namespace: 'default',
  text: 'This is a sample document entry',
  users: undefined,
};

export const globalDocumentEntry: DocumentEntryCreateFields = {
  ...documentEntry,
  name: 'Sample Global Document Entry',
  users: [],
};

export const indexEntry: IndexEntryCreateFields = {
  name: 'Sample Index Entry',
  type: IndexEntryType.value,
  namespace: 'default',
  index: 'sample-index',
  field: 'sample-field',
  description: 'This is a sample index entry',
  queryDescription: 'Use sample-field to search in sample-index',
  users: undefined,
};
