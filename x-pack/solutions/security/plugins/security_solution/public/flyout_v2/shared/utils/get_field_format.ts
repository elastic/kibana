/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';

/**
 * Returns the format of a given field.
 *
 * Due to compatibility issues we may see the format as either string (legacy) or the SerializedFieldFormat object (modernized)
 * value. This helper extracts the correct one.
 */
export const getFieldFormat = (field?: { format?: string | SerializedFieldFormat }) =>
  typeof field?.format === 'string' ? field.format : field?.format?.id;
