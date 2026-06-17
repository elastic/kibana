/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { FieldSpec } from '@kbn/data-plugin/common';

import type { GetAggregatableFields, UseInspectButtonParams } from './hooks';
import { getAggregatableFields, useInspectButton, useStackByFields } from './hooks';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { TestProviders } from '../../../../common/mock';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('../../../../data_view_manager/hooks/use_browser_fields');

describe('getAggregatableFields', () => {
  test('getAggregatableFields when useLensCompatibleFields = false', () => {
    expect(getAggregatableFields(mockBrowserFields.base?.fields as GetAggregatableFields))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "label": "@timestamp",
          "value": "@timestamp",
        },
      ]
    `);
  });

  test('getAggregatableFields when useLensCompatibleFields = true', () => {
    const useLensCompatibleFields = true;
    expect(
      getAggregatableFields(
        mockBrowserFields?.base?.fields as GetAggregatableFields,
        useLensCompatibleFields
      )
    ).toHaveLength(0);
  });

  describe.each([
    { field: 'destination.domain' },
    { field: 'destination.bytes' },
    { field: 'destination.ip' },
  ])('$field', ({ field }) => {
    test(`type ${mockBrowserFields?.destination?.fields?.[field].type} should be supported by Lens Embeddable`, () => {
      const useLensCompatibleFields = true;

      expect(
        getAggregatableFields(
          { [field]: mockBrowserFields?.destination?.fields?.[field] as Partial<FieldSpec> },
          useLensCompatibleFields
        )
      ).toHaveLength(1);
    });
  });
});

describe('hooks', () => {
  const mockUseBrowserFields = useBrowserFields as jest.Mock;

  describe('useInspectButton', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const defaultParams: UseInspectButtonParams = {
      setQuery: jest.fn(),
      response: '',
      request: '',
      refetch: jest.fn(),
      uniqueQueryId: 'test-uniqueQueryId',
      deleteQuery: jest.fn(),
      loading: false,
    };

    it('calls setQuery when rendering', () => {
      const mockSetQuery = jest.fn();

      renderHook(() => useInspectButton({ ...defaultParams, setQuery: mockSetQuery }));

      expect(mockSetQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          id: defaultParams.uniqueQueryId,
        })
      );
    });

    it('calls deleteQuery when unmounting', () => {
      const mockDeleteQuery = jest.fn();

      const result = renderHook(() =>
        useInspectButton({ ...defaultParams, deleteQuery: mockDeleteQuery })
      );
      result.unmount();

      expect(mockDeleteQuery).toHaveBeenCalledWith({ id: defaultParams.uniqueQueryId });
    });
  });

  describe('useStackByFields', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns only aggregateable fields', () => {
      mockUseBrowserFields.mockReturnValue(mockBrowserFields);

      const wrapper = ({ children }: React.PropsWithChildren) => (
        <TestProviders>{children}</TestProviders>
      );
      const { result, unmount } = renderHook(() => useStackByFields(), { wrapper });
      const aggregateableFields = result.current();
      unmount();
      expect(aggregateableFields!.find((field) => field.label === 'agent.id')).toBeTruthy();
      expect(
        aggregateableFields!.find((field) => field.label === 'nestedField.firstAttributes')
      ).toBe(undefined);
    });

    it('returns only Lens compatible fields (check if one of esTypes is keyword)', () => {
      mockUseBrowserFields.mockReturnValue({ base: mockBrowserFields.base });

      const wrapper = ({ children }: React.PropsWithChildren) => (
        <TestProviders>{children}</TestProviders>
      );
      const useLensCompatibleFields = true;
      const { result, unmount } = renderHook(() => useStackByFields(useLensCompatibleFields), {
        wrapper,
      });
      const aggregateableFields = result.current();
      unmount();
      expect(aggregateableFields!.find((field) => field.label === '@timestamp')).toBeUndefined();
      expect(aggregateableFields!.find((field) => field.label === '_id')).toBeUndefined();
    });

    it('returns only Lens compatible fields (check if it is a nested field)', () => {
      mockUseBrowserFields.mockReturnValue({ nestedField: mockBrowserFields.nestedField });

      const wrapper = ({ children }: React.PropsWithChildren) => (
        <TestProviders>{children}</TestProviders>
      );
      const useLensCompatibleFields = true;
      const { result, unmount } = renderHook(() => useStackByFields(useLensCompatibleFields), {
        wrapper,
      });
      const aggregateableFields = result.current();
      unmount();
      expect(aggregateableFields).toHaveLength(0);
    });
  });
});
