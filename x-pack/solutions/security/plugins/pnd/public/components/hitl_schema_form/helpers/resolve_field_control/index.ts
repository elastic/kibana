/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndSchemaFormFieldSchema } from '../../types';

/** The EUI controls a schema property can render as. */
export const PND_SCHEMA_FORM_CONTROLS = [
  'comboBox',
  'fieldNumber',
  'fieldText',
  'select',
  'switch',
] as const;

export type PndSchemaFormControl = (typeof PND_SCHEMA_FORM_CONTROLS)[number];

/**
 * Which control a schema property renders as.
 *
 * **A non-empty enum wins over the property's type**, because a closed list of
 * choices is a stronger statement about the field than `string` or `number` is:
 * a numeric enum is a select, not a number field. The single exception is
 * `array`, which is inherently multi-select and takes its choices from
 * `items.enum` instead.
 *
 * Total, so an unforeseen shape lands on a text field rather than on nothing —
 * though {@link canRenderWithSchemaForm} should have rejected it long before.
 */
export const resolveFieldControl = (field: PndSchemaFormFieldSchema): PndSchemaFormControl => {
  const { enum: fieldEnum, type } = field;

  if (type !== 'array' && fieldEnum != null && fieldEnum.length > 0) return 'select';
  if (type === 'array') return 'comboBox';
  if (type === 'boolean') return 'switch';
  if (type === 'number') return 'fieldNumber';

  return 'fieldText';
};
