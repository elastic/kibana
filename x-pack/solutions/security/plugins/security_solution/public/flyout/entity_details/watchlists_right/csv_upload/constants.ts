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

export const SUPPORTED_FILE_EXTENSIONS = ['CSV'];

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB, matching server limit

export const REQUIRED_HEADERS = ['type'];
