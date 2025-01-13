/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';
import { BulkErrorSchema } from '@kbn/securitysolution-io-ts-list-types';

import { ImportResponse } from '../../import_exception_list_and_items';

import { isImportRegular } from './is_import_regular';

/**
 * Helper to sort responses into success and error and report on
 * final results
 * @param responses {array}
 * @returns {object} totals of successes and errors
 */
export const sortImportResponses = (
  responses: ImportResponse[]
): {
  errors: BulkErrorSchema[];
  success: boolean;
  success_count: number;
} => {
  const errorsResp = responses.filter((resp) => has('error', resp)) as BulkErrorSchema[];
  const successes = responses.filter((resp) => {
    if (isImportRegular(resp)) {
      return resp.status_code === 200;
    } else {
      return false;
    }
  });

  return {
    errors: errorsResp,
    success: errorsResp.length === 0,
    success_count: successes.length,
  };
};
