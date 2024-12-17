/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';

import { ImportExceptionsOk, ImportResponse } from '../../import_exception_list_and_items';

/**
 * Helper to determine if response is error response or not
 * @param importExceptionsResponse {array} successful or error responses
 * @returns {boolean}
 */
export const isImportRegular = (
  importExceptionsResponse: ImportResponse
): importExceptionsResponse is ImportExceptionsOk => {
  return !has('error', importExceptionsResponse) && has('status_code', importExceptionsResponse);
};
