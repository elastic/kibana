/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockPartitionedFieldMetadata } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { mockPartitionedFieldMetadataWithSameFamily } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata_with_same_family';
import {
  getEscapedIncompatibleMappingsFields,
  getEscapedIncompatibleValuesFields,
  getEscapedSameFamilyFields,
} from './metadata';

describe('getEscapedIncompatibleMappingsFields', () => {
  test('it (only) returns incompatible mapping fields', () => {
    expect(getEscapedIncompatibleMappingsFields(mockPartitionedFieldMetadata.incompatible)).toEqual(
      ['host.name', 'source.ip']
    );
  });

  test('it escapes newlines from the field names', () => {
    const fieldWithNewlines = {
      ...mockPartitionedFieldMetadata.incompatible[1],
      indexFieldName: 'host.name\nhost.name2',
    };
    expect(getEscapedIncompatibleMappingsFields([fieldWithNewlines])).toEqual([
      'host.name host.name2',
    ]);
  });
});

describe('getEscapedIncompatibleValuesFields', () => {
  test('it (only) returns incompatible values fields', () => {
    expect(getEscapedIncompatibleValuesFields(mockPartitionedFieldMetadata.incompatible)).toEqual([
      'event.category',
    ]);
  });

  test('it escapes newlines from the field names', () => {
    const fieldWithNewlines = {
      ...mockPartitionedFieldMetadata.incompatible[0],
      indexFieldName: 'event.category\nhost.name',
    };
    expect(getEscapedIncompatibleValuesFields([fieldWithNewlines])).toEqual([
      'event.category host.name',
    ]);
  });
});

describe('getEscapedSameFamilyFields', () => {
  test('it returns same family fields with escaped newlines in field names', () => {
    const fieldWithNewlines = {
      ...mockPartitionedFieldMetadataWithSameFamily.sameFamily[0],
      indexFieldName: 'event.category\nhost.name',
    };
    expect(getEscapedSameFamilyFields([fieldWithNewlines])).toEqual(['event.category host.name']);
  });
});
