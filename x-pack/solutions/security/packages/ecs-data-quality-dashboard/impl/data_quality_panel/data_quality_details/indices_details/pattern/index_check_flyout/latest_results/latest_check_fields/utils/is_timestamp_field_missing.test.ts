/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  eventCategory,
  timestamp,
} from '../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { isTimestampFieldMissing } from './is_timestamp_field_missing';

describe('isTimestampFieldMissing', () => {
  test('it returns true when `enrichedFieldMetadata` is empty', () => {
    expect(isTimestampFieldMissing([])).toBe(true);
  });

  test('it returns false when `enrichedFieldMetadata` contains an @timestamp field', () => {
    expect(isTimestampFieldMissing([timestamp, eventCategory])).toBe(false);
  });

  test('it returns true when `enrichedFieldMetadata` does NOT contain an @timestamp field', () => {
    expect(isTimestampFieldMissing([eventCategory])).toBe(true);
  });
});
