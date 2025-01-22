/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormHook, ArrayItem } from '../../../../shared_imports';

interface PickTypeForNameParameters {
  name: string;
  type: string;
  typesByFieldName?: Record<string, string[] | undefined>;
}

export function pickTypeForName({ name, type, typesByFieldName = {} }: PickTypeForNameParameters) {
  const typesAvailableForName = typesByFieldName[name] || [];
  const isCurrentTypeAvailableForNewName = typesAvailableForName.includes(type);

  /* First try to keep the type if it's available for the name */
  if (isCurrentTypeAvailableForNewName) {
    return type;
  }

  /*
    If current type is not available, pick the first available type.
    If no type is available, use the current type.
  */
  return typesAvailableForName[0] ?? type;
}

/**
 * Returns a list of flattened field names for a given array field of a form.
 * Flattened field name is a string that represents the path to an item in an array field.
 * For example, a field "myArrayField" can be represented as "myArrayField[0]", "myArrayField[1]", etc.
 *
 * Flattened field names are useful:
 * - when you need to subscribe to changes in an array field using `useFormData` "watch" option
 * - when you need to retrieve form data before serializer function is applied
 *
 * @param {Object} form - Form object.
 * @param {string} arrayFieldName - Path to the array field.
 * @returns {string[]} - Flattened array field names.
 */
export function getFlattenedArrayFieldNames(
  form: { getFields: FormHook['getFields'] },
  arrayFieldName: string
): string[] {
  const internalField = form.getFields()[`${arrayFieldName}__array__`] ?? {};
  const internalFieldValue = (internalField?.value ?? []) as ArrayItem[];

  return internalFieldValue.map((item) => item.path);
}
