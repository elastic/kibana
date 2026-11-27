/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set } from '@kbn/safer-lodash-set';
import { get, isEmpty } from 'lodash/fp';
import { toObjectArrayOfStrings } from '../../../common/utils/to_array';

export function getFlattenedFields<T>(
  fields: string[],
  hitFields: T,
  fieldMap: Readonly<Record<string, unknown>>,
  parentField?: string
) {
  return fields.reduce((flattenedFields, fieldName) => {
    const fieldPath = `${fieldName}`;
    const esField = get(`${parentField ?? ''}['${fieldName}']`, fieldMap);

    if (!isEmpty(esField)) {
      const fieldValue = get(`${parentField ?? ''}['${esField}']`, hitFields);
      if (!isEmpty(fieldValue)) {
        return set(
          flattenedFields,
          fieldPath,
          toObjectArrayOfStrings(fieldValue).map(({ str }) => str)
        );
      }
    }

    return flattenedFields;
  }, {});
}
