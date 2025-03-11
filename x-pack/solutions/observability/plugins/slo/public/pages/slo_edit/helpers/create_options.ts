/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';

export interface Option {
  label: string;
  value: string;
}

export function createOptionsFromFields(
  fields: FieldSpec[],
  filterFn?: (option: Option) => boolean
): Option[] {
  const options = fields
    .map((field) => ({ label: field.name, value: field.name }))
    .sort((a, b) => String(a.label).localeCompare(b.label));

  if (filterFn) {
    return options.filter(filterFn);
  }

  return options;
}
