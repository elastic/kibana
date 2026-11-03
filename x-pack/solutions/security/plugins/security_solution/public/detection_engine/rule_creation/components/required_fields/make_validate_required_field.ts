/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredFieldInput } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import type { ERROR_CODE, FormData, FormHook, ValidationFunc } from '../../../../shared_imports';
import * as i18n from './translations';
import { getFlattenedArrayFieldNames } from '../utils';

export function makeValidateRequiredField(parentFieldPath: string) {
  return function validateRequiredField(
    ...args: Parameters<ValidationFunc<FormData, string, RequiredFieldInput>>
  ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined {
    const [{ value, path, form, formData }] = args;

    const fieldNameCounts = getFieldNameCounts(form, formData, parentFieldPath);
    const isFieldNameUsedMoreThanOnce = (fieldNameCounts.get(value.name) ?? 0) > 1;

    if (isFieldNameUsedMoreThanOnce) {
      return {
        code: 'ERR_FIELD_FORMAT',
        path: `${path}.name`,
        message: i18n.FIELD_NAME_USED_MORE_THAN_ONCE(value.name),
      };
    }

    /* Allow empty rows. They are going to be removed before submission. */
    if (value.name.trim().length === 0 && value.type.trim().length === 0) {
      return;
    }

    if (value.name.trim().length === 0) {
      return {
        code: 'ERR_FIELD_MISSING',
        path: `${path}.name`,
        message: i18n.FIELD_NAME_REQUIRED,
      };
    }

    if (value.type.trim().length === 0) {
      return {
        code: 'ERR_FIELD_MISSING',
        path: `${path}.type`,
        message: i18n.FIELD_TYPE_REQUIRED,
      };
    }
  };
}

interface FieldNameCountsCacheEntry {
  formData: FormData;
  parentFieldPath: string;
  counts: Map<string, number>;
}

let fieldNameCountsCache: FieldNameCountsCacheEntry | undefined;

/*
  The form validates all rows synchronously in a single pass, so counting names per row would make
  the pass O(N^2). Counts are computed once and reused by the rest of the rows' validators in the
  same pass. The cache is keyed by the form data object, which is shared within a pass and replaced
  on any field value change, and is dropped in a microtask, so the next pass sees fresh values.
*/
function getFieldNameCounts(
  form: { getFields: FormHook['getFields'] },
  formData: FormData,
  parentFieldPath: string
): Map<string, number> {
  if (
    fieldNameCountsCache?.formData === formData &&
    fieldNameCountsCache.parentFieldPath === parentFieldPath
  ) {
    return fieldNameCountsCache.counts;
  }

  const counts = new Map<string, number>();

  for (const { name } of getAllRequiredFieldsValues(form, parentFieldPath)) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const cacheEntry = { formData, parentFieldPath, counts };

  fieldNameCountsCache = cacheEntry;
  queueMicrotask(() => {
    if (fieldNameCountsCache === cacheEntry) {
      fieldNameCountsCache = undefined;
    }
  });

  return counts;
}

function getAllRequiredFieldsValues(
  form: { getFields: FormHook['getFields'] },
  parentFieldPath: string
) {
  /*
    Getting values for required fields via flattened fields instead of using `getFormData`.
    This is because `getFormData` applies a serializer function to field values, which might update values.
    Using flattened fields allows us to get the original values before the serializer function is applied.
  */
  const flattenedFieldNames = getFlattenedArrayFieldNames(form, parentFieldPath);
  const fields = form.getFields();

  return flattenedFieldNames.map(
    (fieldName) => fields[fieldName]?.value ?? {}
  ) as RequiredFieldInput[];
}
