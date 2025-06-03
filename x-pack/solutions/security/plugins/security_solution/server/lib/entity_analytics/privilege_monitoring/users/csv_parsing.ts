/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformOptions } from 'stream';
import type { Either } from 'fp-ts/Either';
import { parseMonitoredPrivilegedUserCsvRow } from '../../../../../common/entity_analytics/privileged_user_monitoring/parse_privileged_user_monitoring_csv_row';

export const csvToUserDoc: TransformOptions['transform'] = function (
  chunk: string[],
  encoding: string,
  callback: (error: Error | null, data?: Either<string, string>) => void
) {
  callback(null, parseMonitoredPrivilegedUserCsvRow(chunk));
};
