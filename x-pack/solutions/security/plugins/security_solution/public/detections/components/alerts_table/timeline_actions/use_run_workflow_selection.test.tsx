/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SecurityPageName } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import type { RunWorkflowSelectionScope } from './use_run_workflow_selection';
import {
  useResolvedRunWorkflowSelection,
  useRunWorkflowSelectionSearch,
} from './use_run_workflow_selection';

jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useDispatch: () => jest.fn(),
}));
jest.mock('../../../../common/lib/apm/use_track_http_request');
jest.mock('../../../../common/utils/route/use_route_spy', () => ({
  useRouteSpy: () => [{ pageName: SecurityPageName.hosts }],
}));
jest.mock('../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));

const useKibanaMock = useKibana as jest.Mock;

const selectionScope: RunWorkflowSelectionScope = {
  dataViewId: 'security-solution-default',
  indexNames: ['logs-*'],
  filterQuery: '{"bool":{}}',
  from: '2026-01-01T00:00:00.000Z',
  to: '2026-01-02T00:00:00.000Z',
  runtimeMappings: {},
  queryId: 'test-table-run-workflow-selection',
};

const mockSearchResponse = {
  isRunning: false,
  edges: [{ node: { _id: 'doc-1', _index: 'logs-a', data: [], ecs: { _id: 'doc-1' } } }],
  pageInfo: { activePage: 0, querySize: 500 },
  rawResponse: {},
  totalCount: 1,
};

/** Resolves a select-all from a search created in the same component, as the events panel does. */
const renderResolvedSelection = (scope: RunWorkflowSelectionScope) => {
  const committedStatuses: string[] = [];
  const { result } = renderHook(() => {
    const searchSelectionIds = useRunWorkflowSelectionSearch(scope);
    const selection = useResolvedRunWorkflowSelection({
      isAllSelected: true,
      pageSelections: [],
      searchSelectionIds,
    });
    useLayoutEffect(() => {
      committedStatuses.push(selection.status);
    });
    return selection;
  });
  return { result, committedStatuses };
};

describe('useRunWorkflowSelectionSearch', () => {
  beforeEach(() => {
    useKibanaMock.mockReturnValue({
      services: {
        data: {
          search: {
            showError: jest.fn(),
            search: () => ({
              subscribe: ({ next }: { next: (response: typeof mockSearchResponse) => void }) => {
                const timeout = setTimeout(() => next(mockSearchResponse), 10);
                return { unsubscribe: () => clearTimeout(timeout) };
              },
            }),
          },
        },
      },
    });
  });

  // The timeline handler cannot start until it has built its request, which a freshly mounted
  // panel has not done yet. That must not surface as a failure.
  it('stays loading until the search can start instead of reporting a failure on mount', async () => {
    const { result, committedStatuses } = renderResolvedSelection(selectionScope);

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(committedStatuses).not.toContain('error');
    expect(result.current).toEqual({
      status: 'ready',
      selections: [{ _id: 'doc-1', _index: 'logs-a' }],
    });
  });

  it('still reports a search that can never start', async () => {
    const { result } = renderResolvedSelection({ ...selectionScope, indexNames: [] });

    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
