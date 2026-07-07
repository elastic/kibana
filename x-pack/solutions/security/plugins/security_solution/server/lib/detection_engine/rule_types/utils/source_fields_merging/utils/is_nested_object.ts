/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectLike } from 'lodash/fp';
import { isTypeObject } from './is_type_object';
import type { FieldsType } from '../types';

/**
 * Returns true if the first value is object-like but does not contain the shape of
 * a "type object" such as geo point, then it makes an assumption everything is objectlike
 * and not "type object" for all the array values. This should be used only for checking
 * for nested object types within fields.
 * @param fieldsValue The value to check if the first element is object like or not
 * @returns True if this is a nested object, otherwise false.
 */
export const isNestedObject = (fieldsValue: FieldsType): boolean => {
  return isObjectLike(fieldsValue[0]) && !isTypeObject(fieldsValue);
};
