/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME } from './constants';
import { getSavedObjectNamePattern } from './get_saved_object_name_pattern';

/**
 * Given an index this will return the pattern of "exceptionsList_${index}"
 * @param index The index to suffix the string
 * @returns The pattern of "exceptionsList_${index}"
 * @throws TypeError if index is less than zero
 */
export const getSavedObjectNamePatternForExceptionsList = (index: number): string => {
  if (!(index >= 0)) {
    throw new TypeError(`"index" should alway be >= 0 instead of: ${index}`);
  } else {
    return getSavedObjectNamePattern({ name: EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME, index });
  }
};
