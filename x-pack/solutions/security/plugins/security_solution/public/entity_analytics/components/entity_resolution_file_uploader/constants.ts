/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLUTION_CSV_MAX_SIZE_BYTES } from '../../../../common/entity_analytics/entity_store/constants';

export const SUPPORTED_FILE_TYPES = [
  'text/csv',
  'text/plain',
  'text/tab-separated-values',
  '.tsv',
  '.csv',
];
export const SUPPORTED_FILE_EXTENSIONS = ['CSV', 'TXT', 'TSV'];
export const MAX_FILE_SIZE_BYTES = RESOLUTION_CSV_MAX_SIZE_BYTES;

export const VALID_ENTITY_TYPES = ['user', 'host', 'service', 'generic'];
export const REQUIRED_COLUMNS = ['type', 'resolved_to'];
