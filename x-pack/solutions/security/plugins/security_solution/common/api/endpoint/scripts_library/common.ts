/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SCRIPT_TAGS } from '../../../endpoint/service/scripts_library/constants';
import { validateNoDuplicateValues, validateNonEmptyString } from '../schema_utils';
import { SUPPORTED_HOST_OS_TYPE } from '../../../endpoint/constants';

export const ScriptNameSchema = schema.string({ minLength: 1, validate: validateNonEmptyString });
export const ScriptFileSchema = schema.stream();
export const ScriptRequiresInputSchema = schema.boolean({ defaultValue: false });
export const ScriptDescriptionSchema = schema.string({
  minLength: 1,
  validate: validateNonEmptyString,
});
export const ScriptInstructionsSchema = schema.string({
  minLength: 1,
  validate: validateNonEmptyString,
});
export const ScriptExampleSchema = schema.string({
  minLength: 1,
  validate: validateNonEmptyString,
});
export const ScriptPlatformSchema = schema.arrayOf(
  // @ts-expect-error TS2769: No overload matches this call. (due to now `oneOf()` type is defined)
  schema.oneOf(SUPPORTED_HOST_OS_TYPE.map((osType) => schema.literal(osType))),
  { minSize: 1, maxSize: 3, validate: validateNoDuplicateValues }
);

export const ScriptPathToExecutableSchema = schema.string({
  minLength: 1,
  validate: validateNonEmptyString,
});

export const ScriptTagsSchema = schema.arrayOf(
  // @ts-expect-error TS2769: No overload matches this call. (due to now `oneOf()` type is defined)
  schema.oneOf(Object.keys(SCRIPT_TAGS).map((osType) => schema.literal(osType))),
  { minSize: 1, maxSize: Object.keys(SCRIPT_TAGS).length, validate: validateNoDuplicateValues }
);
