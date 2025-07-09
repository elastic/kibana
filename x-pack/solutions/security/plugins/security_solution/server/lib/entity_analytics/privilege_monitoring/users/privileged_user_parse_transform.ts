/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';
import { right, left, isRight } from 'fp-ts/Either';
import type { Either } from 'fp-ts/Either';

import { parseMonitoredPrivilegedUserCsvRow } from '../../../../../common/entity_analytics/privileged_user_monitoring/parse_privileged_user_monitoring_csv_row';
import type { BulkPrivMonUser, BulkProcessingError } from './bulk/types';

/**
 * Transform stream that processes rows of a CSV file containing privileged user data.
 * It parses each row, extracting the username and returning it in a structured format.
 * @param {number} initialRowIndex - The starting index for the rows, defaults to 1, since CSV file are not zero indexed.
 */
export const privilegedUserParserTransform = (initialRowIndex = 1) => {
  let index = initialRowIndex;

  return new Transform({
    objectMode: true,
    transform(row: string[], _encoding, callback) {
      const result = parseMonitoredPrivilegedUserCsvRow(row);

      const formattedResult: Either<BulkProcessingError, BulkPrivMonUser> = isRight(result)
        ? right({ username: result.right, index })
        : left({ index, message: result.left, username: null }); // The username could not be found in the row

      index++;
      callback(null, formattedResult);
    },
  });
};
