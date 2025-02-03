/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConditionalPath } from './path_utils';

/**
 * Given a field, returns a painless script that checks if the field is missing or empty.
 *
 * @param {string} field The field to check with dot notation e.g ctx.a.b.c
 * @return {*}  {string} The painless script that checks if the field is missing or empty
 */
export const isFieldMissingOrEmpty = (field: string): string => {
  const conditionalPath = getConditionalPath(field);

  const classesWithEmptyCheck = ['Collection', 'String', 'Map'];
  const emptyCheck = `((${classesWithEmptyCheck
    .map((c) => `${field} instanceof ${c}`)
    .join(' || ')}) && ${field}.isEmpty())`;

  return `${conditionalPath} == null || ${emptyCheck}`;
};
