/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { toBulkCloseRuntimeMappings } from './runtime_mappings_for_bulk_close';

describe('toBulkCloseRuntimeMappings', () => {
  it('returns undefined when called without arguments', () => {
    expect(toBulkCloseRuntimeMappings()).toBeUndefined();
  });

  it('returns undefined when called with undefined', () => {
    expect(toBulkCloseRuntimeMappings(undefined)).toBeUndefined();
  });

  it('returns undefined when the mappings object is empty', () => {
    expect(toBulkCloseRuntimeMappings({})).toBeUndefined();
  });

  it('returns undefined when all entries have unsupported types', () => {
    const mappings: MappingRuntimeFields = {
      composite_field: { type: 'composite', fields: { sub: { type: 'keyword' } } },
      lookup_field: { type: 'lookup', target_index: 'other' },
    } as unknown as MappingRuntimeFields;
    expect(toBulkCloseRuntimeMappings(mappings)).toBeUndefined();
  });

  it('keeps type for a simple scriptless field', () => {
    const result = toBulkCloseRuntimeMappings({ process_risk_label: { type: 'keyword' } });
    expect(result).toEqual({ process_risk_label: { type: 'keyword' } });
  });

  it('preserves the script for a scripted runtime field (the core fix)', () => {
    const result = toBulkCloseRuntimeMappings({
      display_name: {
        type: 'keyword',
        script: { source: "emit(doc['first.name'].value + ' ' + doc['last.name'].value)" },
      },
    });
    expect(result?.display_name?.type).toBe('keyword');
    expect(result?.display_name?.script?.source).toBe(
      "emit(doc['first.name'].value + ' ' + doc['last.name'].value)"
    );
  });

  it('normalises a bare-string script to { source }', () => {
    // The data view format allows script as a bare string; ES client types require
    // an object, so we widen through unknown to simulate that input.
    const mappings = {
      my_field: { type: 'keyword', script: "emit(doc['x'].value)" },
    } as unknown as MappingRuntimeFields;
    const result = toBulkCloseRuntimeMappings(mappings);
    expect(result?.my_field?.script?.source).toBe("emit(doc['x'].value)");
  });

  it('drops an entry whose script is a non-inline object (e.g. stored-script id)', () => {
    // A stored-script object { id, params } has no source property. Forwarding
    // only { type } would silently change semantics to a _source reader; drop
    // the entire entry instead so the caller can see 0 docs rather than a wrong set.
    const mappings = {
      stored_rt: { type: 'keyword', script: { id: 'my-stored-script', params: {} } },
      valid_rt: { type: 'keyword', script: { source: "emit('ok')" } },
    } as unknown as MappingRuntimeFields;
    const result = toBulkCloseRuntimeMappings(mappings);
    expect(result).not.toHaveProperty('stored_rt');
    expect(result?.valid_rt?.script?.source).toBe("emit('ok')");
  });

  it('preserves format for date fields', () => {
    const result = toBulkCloseRuntimeMappings({
      event_date: { type: 'date', format: 'strict_date_optional_time' },
    });
    expect(result?.event_date?.format).toBe('strict_date_optional_time');
  });

  it('strips fetch_fields, input_field, target_field, target_index from lookup-type entries that slip through (guard)', () => {
    // This shouldn't happen in practice because lookup is filtered, but shows
    // that unknown keys do not propagate.
    const result = toBulkCloseRuntimeMappings({
      valid_keyword: {
        type: 'keyword',
        // @ts-expect-error — simulating unknown extra properties from ES client types
        unknown_prop: 'should_not_appear',
      },
    });
    expect(result?.valid_keyword).not.toHaveProperty('unknown_prop');
  });

  it('drops composite and lookup types while keeping supported sibling entries', () => {
    const mappings: MappingRuntimeFields = {
      process_risk_label: { type: 'keyword' },
      composite_field: { type: 'composite', fields: { sub: { type: 'keyword' } } },
      score: { type: 'long' },
      lookup_field: { type: 'lookup', target_index: 'other' },
    } as unknown as MappingRuntimeFields;

    const result = toBulkCloseRuntimeMappings(mappings);
    expect(Object.keys(result ?? {}).sort()).toEqual(['process_risk_label', 'score']);
    expect(result?.process_risk_label?.type).toBe('keyword');
    expect(result?.score?.type).toBe('long');
  });

  it('handles all seven supported types without dropping any', () => {
    const mappings: MappingRuntimeFields = {
      kw_field: { type: 'keyword' },
      long_field: { type: 'long' },
      double_field: { type: 'double' },
      date_field: { type: 'date' },
      ip_field: { type: 'ip' },
      bool_field: { type: 'boolean' },
      geo_field: { type: 'geo_point' },
    };
    const result = toBulkCloseRuntimeMappings(mappings);
    expect(Object.keys(result ?? {}).sort()).toEqual([
      'bool_field',
      'date_field',
      'double_field',
      'geo_field',
      'ip_field',
      'kw_field',
      'long_field',
    ]);
  });
});
