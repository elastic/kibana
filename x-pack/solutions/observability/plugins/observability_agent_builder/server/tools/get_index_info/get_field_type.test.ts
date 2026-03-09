/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import { getFieldType } from './get_field_type';

describe('getFieldType', () => {
  it('returns the concrete type, ignoring unmapped', () => {
    const fieldTypes: Record<string, FieldCapsFieldCapability> = {
      keyword: { type: 'keyword', searchable: true, aggregatable: true, metadata_field: false },
      unmapped: { type: 'unmapped', searchable: false, aggregatable: false, metadata_field: false },
    };

    expect(getFieldType(fieldTypes)).toBe('keyword');
  });

  it('returns undefined when only excluded types are present', () => {
    const fieldTypes: Record<string, FieldCapsFieldCapability> = {
      object: { type: 'object', searchable: false, aggregatable: false, metadata_field: false },
      nested: { type: 'nested', searchable: false, aggregatable: false, metadata_field: false },
      unmapped: { type: 'unmapped', searchable: false, aggregatable: false, metadata_field: false },
    };

    expect(getFieldType(fieldTypes)).toBeUndefined();
  });

  it('returns the single concrete type', () => {
    const fieldTypes: Record<string, FieldCapsFieldCapability> = {
      long: { type: 'long', searchable: true, aggregatable: true, metadata_field: false },
    };

    expect(getFieldType(fieldTypes)).toBe('long');
  });

  it('returns undefined for an empty record', () => {
    expect(getFieldType({})).toBeUndefined();
  });
});
