/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SUPPORTED_FILE_TYPES = [
  'text/csv',
  'text/plain',
  '.csv', // if windows can't recognise the file extension.
];

export const MAX_WATCHLIST_NAME_LENGTH = 256;
export const MAX_WATCHLIST_DESCRIPTION_LENGTH = 1000;
