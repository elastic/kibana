/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UploadWatchlistCsvResponse } from '../../../../../common/api/entity_analytics/watchlists/csv_upload/csv_upload.gen';

export type CsvUploadStatus = 'idle' | 'validating' | 'ready' | 'uploading' | 'success' | 'error';

export interface ValidatedFile {
  file: File;
  name: string;
  size: number;
  rowCount: number;
  headers: string[];
}

export type { UploadWatchlistCsvResponse };
