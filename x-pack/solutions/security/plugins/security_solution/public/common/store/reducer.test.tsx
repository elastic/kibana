/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { SecuritySubPlugins } from '../../app/types';
import { createInitialState } from './reducer';
import { createMockStore, mockIndexPattern, mockSourcererState, TestProviders } from '../mock';
import { useSourcererDataView } from '../../sourcerer/containers';
import { renderHook } from '@testing-library/react';
import { initialGroupingState } from './grouping/reducer';
import { initialAnalyzerState } from '../../resolver/store/helpers';
import { initialNotesState } from '../../notes/store/notes.slice';

jest.mock('../hooks/use_selector');
jest.mock('../lib/kibana', () => {
  const original = jest.requireActual('../lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        upselling: {
          ...original.useKibana().services.upselling,
          featureUsage: {
            ...original.useKibana().services.upselling.featureUsage,
            hasShown: jest.fn(),
          },
        },
      },
    }),
    KibanaServices: {
      get: jest.fn(() => ({ uiSettings: { get: () => ({ from: 'now-24h', to: 'now' }) } })),
    },
  };
});
jest.mock('../containers/source', () => ({
  useFetchIndex: () => [
    false,
    { indexes: [], indicesExist: true, indexPatterns: mockIndexPattern },
  ],
}));

// TODO: this is more of a hook test, a reducer is a pure function and should not need hooks and context to test.
describe('createInitialState', () => {
  describe('sourcerer -> default -> indicesExist', () => {
    const mockPluginState = {} as Omit<
      SecuritySubPlugins['store']['initialState'],
      'app' | 'dragAndDrop' | 'inputs' | 'sourcerer'
    >;
    const defaultState = {
      defaultDataView: mockSourcererState.defaultDataView,
      kibanaDataViews: [mockSourcererState.defaultDataView],
      signalIndexName: 'siem-signals-default',
      signalIndexMappingOutdated: false,
    };
    const initState = createInitialState(
      mockPluginState,
      defaultState,
      {
        dataTable: { tableById: {} },
      },
      {
        groups: initialGroupingState,
      },
      {
        analyzer: initialAnalyzerState,
      },
      initialNotesState
    );

    test('indicesExist should be TRUE if patternList is NOT empty', async () => {
      const { result } = renderHook(() => useSourcererDataView(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders store={createMockStore(initState)}>{children}</TestProviders>
        ),
      });
      expect(result.current.indicesExist).toEqual(true);
    });

    test('indicesExist should be FALSE if patternList is empty', () => {
      const state = createInitialState(
        mockPluginState,
        {
          ...defaultState,
          defaultDataView: {
            ...defaultState.defaultDataView,
            patternList: [],
          },
          kibanaDataViews: [
            {
              ...defaultState.defaultDataView,
              patternList: [],
            },
          ],
        },
        {
          dataTable: {
            tableById: {},
          },
        },
        {
          groups: initialGroupingState,
        },
        {
          analyzer: initialAnalyzerState,
        },
        initialNotesState
      );
      const { result } = renderHook(() => useSourcererDataView(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders store={createMockStore(state)}>{children}</TestProviders>
        ),
      });
      expect(result.current.indicesExist).toEqual(false);
    });
  });
});
