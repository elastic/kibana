/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import { mockCasesResult, parsedCasesItems } from './mock_data';
import { useCaseItems } from './use_case_items';

import type { UseCaseItems, UseCaseItemsProps } from './use_case_items';

const dateNow = new Date('2022-04-08T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

const defaultCasesReturn = {
  cases: [],
};

const mockCasesApi = jest.fn().mockResolvedValue(defaultCasesReturn);
const mockKibana = {
  services: {
    cases: {
      api: {
        cases: {
          find: (...props: unknown[]) => mockCasesApi(...props),
        },
      },
    },
  },
};

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => mockKibana,
}));

const from = '2020-07-07T08:20:18.966Z';
const to = '2020-07-08T08:20:18.966Z';
const mockSetQuery = jest.fn();
const mockDeleteQuery = jest.fn();

const mockUseGlobalTime = jest
  .fn()
  .mockReturnValue({ from, to, setQuery: mockSetQuery, deleteQuery: mockDeleteQuery });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const renderUseCaseItems = (overrides: Partial<UseCaseItemsProps> = {}) =>
  renderHook<ReturnType<UseCaseItems>, UseCaseItems>(() =>
    useCaseItems({ skip: false, ...overrides })
  );

describe('useCaseItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockCasesApi.mockResolvedValue(defaultCasesReturn);
  });

  it('should return default values', async () => {
    const { result } = renderUseCaseItems();

    await waitFor(() => {
      expect(result.current).toEqual({
        items: [],
        isLoading: false,
        updatedAt: dateNow,
      });

      expect(mockCasesApi).toBeCalledWith({
        from: '2020-07-07T08:20:18.966Z',
        to: '2020-07-08T08:20:18.966Z',
        owner: 'securitySolution',
        sortField: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        perPage: 4,
      });
    });
  });

  it('should return parsed items', async () => {
    mockCasesApi.mockReturnValue(mockCasesResult);
    const { result } = renderUseCaseItems();

    await waitFor(() =>
      expect(result.current).toEqual({
        items: parsedCasesItems,
        isLoading: false,
        updatedAt: dateNow,
      })
    );
  });

  test('it should call setQuery when fetching', async () => {
    mockCasesApi.mockReturnValue(mockCasesResult);
    renderUseCaseItems();

    await waitFor(() => expect(mockSetQuery).toHaveBeenCalled());
  });

  test('it should call deleteQuery when unmounting', async () => {
    const { unmount } = renderUseCaseItems();

    unmount();

    await waitFor(() => {
      expect(mockDeleteQuery).toHaveBeenCalled();
    });
  });

  it('should return new updatedAt', async () => {
    const newDateNow = new Date('2022-04-08T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow);
    mockDateNow.mockReturnValueOnce(dateNow);
    mockCasesApi.mockReturnValue(mockCasesResult);

    const { result } = renderUseCaseItems();

    await waitFor(() => {
      expect(mockDateNow).toHaveBeenCalled();
      expect(result.current).toEqual({
        items: parsedCasesItems,
        isLoading: false,
        updatedAt: newDateNow,
      });
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseCaseItems({ skip: true });

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });
  });
});
