/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DependencyList } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useMonitorSave } from './use_monitor_save';
import { updateMonitorAPI } from '../../../state/monitor_management/api';
import type { SyntheticsMonitor } from '../../../../../../common/runtime_types';

jest.mock('react-redux-v7', () => ({ useDispatch: () => jest.fn() }));
jest.mock('react-router-dom', () => ({
  useParams: () => ({ monitorId: 'monitor-id' }),
  useRouteMatch: () => ({ isExact: true }),
}));
jest.mock('@kbn/observability-shared-plugin/public', () => {
  const ReactActual = jest.requireActual('react');
  return {
    FETCH_STATUS: { FAILURE: 'failure', SUCCESS: 'success' },
    useFetcher: (fetcher: () => Promise<unknown>, dependencies: DependencyList) => {
      ReactActual.useEffect(() => {
        void fetcher();
      }, dependencies);
      return { status: 'idle', loading: false };
    },
  };
});
jest.mock('../../../hooks', () => ({ useGetUrlParams: () => ({ spaceId: 'default' }) }));
jest.mock('../../../contexts', () => ({
  useSyntheticsRefreshContext: () => ({ refreshApp: jest.fn() }),
}));
jest.mock('../../../state', () => ({ cleanMonitorListState: jest.fn() }));
jest.mock('../../../state/monitor_management/api', () => ({
  createMonitorAPI: jest.fn(),
  updateMonitorAPI: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../../../utils/kibana_service', () => ({
  kibanaService: { coreStart: {}, toasts: {} },
}));

describe('useMonitorSave', () => {
  it('saves a submission only once when its masked-parameter state is captured', async () => {
    const submission = { name: 'Monitor' } as SyntheticsMonitor;

    const { rerender } = renderHook(
      ({ currentSubmission }) => useMonitorSave({ submission: currentSubmission }),
      {
        initialProps: { currentSubmission: submission },
      }
    );

    await waitFor(() => expect(updateMonitorAPI).toHaveBeenCalledTimes(1));
    rerender({ currentSubmission: submission });

    expect(updateMonitorAPI).toHaveBeenCalledWith({
      id: 'monitor-id',
      spaceId: 'default',
      monitor: submission,
    });
    expect(updateMonitorAPI).toHaveBeenCalledTimes(1);
  });
});
