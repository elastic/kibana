/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse, ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';

export const getErrorFromBulkResponse = (resp: BulkResponse): ErrorCause[] =>
  resp.errors
    ? resp.items
        .map((item) => item.index?.error ?? item.update?.error)
        .filter((e): e is ErrorCause => e !== undefined)
    : [];

export const errorsMsg = (errors: ErrorCause[]): string => {
  if (errors.length > 0) {
    return errors.map((e) => `${e.type}: ${e.reason}`).join('; ');
  }
  return 'No errors found';
};

export const isTimestampGreaterThan = (date1: string, date2: string) => {
  const m1 = moment(date1);
  const m2 = moment(date2);
  if (!m1.isValid()) return false;
  if (!m2.isValid()) return true;
  return m1.isAfter(m2);
};
