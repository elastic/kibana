/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { EntityStoreTableTab, flattenEntityRecord } from './entity_store_table_tab';
import { mockEntityRecord } from '../../mocks';
import { ENTITY_PANEL_TABLE_CONTENT_TEST_ID } from './right/test_ids';

describe('flattenEntityRecord', () => {
  it('flattens a simple object', () => {
    const result = flattenEntityRecord({ foo: 'bar', baz: 42 });
    expect(result).toEqual([
      { field: 'baz', value: '42' },
      { field: 'foo', value: 'bar' },
    ]);
  });

  it('flattens nested objects with dot notation', () => {
    const result = flattenEntityRecord({ entity: { id: 'abc', source: 'logs' } });
    expect(result).toEqual([
      { field: 'entity.id', value: 'abc' },
      { field: 'entity.source', value: 'logs' },
    ]);
  });

  it('handles arrays of primitives', () => {
    const result = flattenEntityRecord({ host: { ip: ['10.0.0.1', '192.168.1.1'] } });
    expect(result).toEqual([{ field: 'host.ip', value: '10.0.0.1, 192.168.1.1' }]);
  });

  it('skips null and undefined values', () => {
    const result = flattenEntityRecord({ a: 'keep', b: null, c: undefined });
    expect(result).toEqual([{ field: 'a', value: 'keep' }]);
  });

  it('sorts fields alphabetically', () => {
    const result = flattenEntityRecord({ z: '1', a: '2', m: '3' });
    expect(result.map((r) => r.field)).toEqual(['a', 'm', 'z']);
  });

  it('handles empty object', () => {
    const result = flattenEntityRecord({});
    expect(result).toEqual([]);
  });

  it('flattens a real entity record', () => {
    const result = flattenEntityRecord(mockEntityRecord as unknown as Record<string, unknown>);
    const fields = result.map((r) => r.field);
    expect(fields).toContain('@timestamp');
    expect(fields).toContain('entity.id');
    expect(fields).toContain('host.name');
    expect(fields).toContain('host.ip');
    expect(fields).toContain('asset.criticality');
  });
});

describe('EntityStoreTableTab', () => {
  it('renders the table', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EntityStoreTableTab entityRecord={mockEntityRecord} />
      </TestProviders>
    );

    expect(getByTestId(ENTITY_PANEL_TABLE_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('renders field and value columns', () => {
    const { getByText } = render(
      <TestProviders>
        <EntityStoreTableTab entityRecord={mockEntityRecord} />
      </TestProviders>
    );

    expect(getByText('Field')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();
  });

  it('renders entity record fields in the table', () => {
    const { getByText, getAllByText } = render(
      <TestProviders>
        <EntityStoreTableTab entityRecord={mockEntityRecord} />
      </TestProviders>
    );

    expect(getByText('entity.id')).toBeInTheDocument();
    expect(getByText('test-entity-id-host-abc123')).toBeInTheDocument();
    expect(getByText('host.name')).toBeInTheDocument();
    // test-host-name appears in both entity.name and host.name
    expect(getAllByText('test-host-name').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the search input', () => {
    const { getByPlaceholderText } = render(
      <TestProviders>
        <EntityStoreTableTab entityRecord={mockEntityRecord} />
      </TestProviders>
    );

    expect(getByPlaceholderText('Filter by field or value')).toBeInTheDocument();
  });
});
