/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';

/** Extracts the primary (non-unmapped) field type from field_caps response */
export function getFieldType(
  fieldTypes: Record<string, FieldCapsFieldCapability>
): string | undefined {
  return Object.keys(fieldTypes).find((type) => type !== 'unmapped');
}
