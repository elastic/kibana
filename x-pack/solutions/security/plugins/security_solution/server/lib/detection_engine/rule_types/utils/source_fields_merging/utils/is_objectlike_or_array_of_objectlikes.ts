/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectLike } from 'lodash/fp';
import { isPlainObject } from 'lodash';
import type { SearchTypes } from '../../../../../../../common/detection_engine/types';

/**
 * Returns true if at least one element is an object, otherwise false if they all are not objects
 * if this is an array. If it is not an array, this will check that single type
 * @param valueInMergedDocument The search type to check if it is object like or not
 * @returns true if is object like and not an array, or true if it is an array and at least 1 element is object like
 */
export const isObjectLikeOrArrayOfObjectLikes = (
  valueInMergedDocument: SearchTypes | null
): boolean => {
  if (Array.isArray(valueInMergedDocument)) {
    return valueInMergedDocument.some((value) => isObjectLike(value));
  } else {
    return isObjectLike(valueInMergedDocument);
  }
};

export const isObjectTypeGuard = (value: SearchTypes): value is Record<string, SearchTypes> => {
  return isPlainObject(value);
};
