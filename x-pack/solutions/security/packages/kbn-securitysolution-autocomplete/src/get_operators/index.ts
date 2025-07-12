/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewFieldBase } from '@kbn/es-query';

import {
  ALL_OPERATORS,
  ENDPOINT_ARTIFACT_OPERATORS,
  OperatorOption,
  doesNotExistOperator,
  existsOperator,
  isNotOperator,
  isOperator,
} from '@kbn/securitysolution-list-utils';

/**
 * Returns the appropriate operators given a field type
 *
 * @param field DataViewFieldBase selected field
 *
 */
export const getOperators = (field: DataViewFieldBase | undefined): OperatorOption[] => {
  if (field == null) {
    return [isOperator];
  } else if (field.type === 'boolean') {
    return [isOperator, isNotOperator, existsOperator, doesNotExistOperator];
  } else if (field.type === 'nested') {
    return [isOperator];
  } else if (field.name === 'file.path.text') {
    return ENDPOINT_ARTIFACT_OPERATORS;
  } else {
    return ALL_OPERATORS;
  }
};
