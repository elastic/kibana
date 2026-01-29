/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EditableScriptFields } from '../../../../common/endpoint/types';

// @remark
// This utility type guard helps to ensure that only fields that are editable

export const isEditableScriptField = (key: string): key is keyof EditableScriptFields => {
  return [
    'name',
    'platform',
    'tags',
    'description',
    'instructions',
    'example',
    'pathToExecutable',
    'requiresInput',
  ].includes(key);
};
