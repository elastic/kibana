/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as E from 'fp-ts/Either';

import { i18n } from '@kbn/i18n';
import type { Either } from 'fp-ts/Either';

export const parseMonitoredPrivilegedUserCsvRow = (row: string[]): Either<string, string> => {
  if (row.length !== 1) {
    return E.left(expectedColumnsError(row.length));
  }

  const [username] = row;
  if (!username) {
    return E.left(missingUserNameError());
  }

  return E.right(username);
};

const expectedColumnsError = (rowLength: number) =>
  i18n.translate(
    'xpack.securitySolution.entityAnalytics.monitoring.privilegedUsers.csvUpload.expectedColumnsError',
    {
      defaultMessage: 'Expected 1 column, got {rowLength}',
      values: { rowLength },
    }
  );

const missingUserNameError = () =>
  i18n.translate(
    'xpack.securitySolution.entityAnalytics.monitoring.privilegedUsers.csvUpload.missingUserNameError',
    {
      defaultMessage: 'Missing user name',
    }
  );
