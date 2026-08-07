/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';
import { createMockWatch, type Watch, type WatchSettings } from '@kbn/pnd-common';
import { WatchDetailPage } from './watch_detail';

const mockMutateAsync = jest.fn();
const mockRefetch = jest.fn();
const mockUseWatch = jest.fn();
const mockServices = {
  application: {
    capabilities: {
      pnd: { write: true },
      workflowsManagement: {
        readWorkflow: true,
        updateWorkflow: true,
      },
    },
  },
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addError: jest.fn(),
    },
  },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: mockServices }),
}));

jest.mock('../../hooks/use_watches_api', () => ({
  useWatch: (watchId: string | undefined) => mockUseWatch(watchId),
  useUpdateWatchSettings: () => ({
    mutateAsync: mockMutateAsync,
    isLoading: false,
  }),
}));

jest.mock('../../hooks/use_pnd_doc_title', () => ({
  usePndDocTitle: jest.fn(),
}));

jest.mock('./components/watches_section_layout', () => ({
  WatchesSectionLayout: ({ children }: { children: React.ReactNode }) => children,
  WatchesSubnavExpandControl: () => null,
}));

jest.mock('./components/recent_runs_table', () => ({
  RecentRunsTable: () => null,
}));

jest.mock('./components/run_sparkline', () => ({
  RunSparkline: () => null,
}));

describe('WatchDetailPage', () => {
  let watch: Watch;

  const renderPage = () => {
    const history = createMemoryHistory({ initialEntries: [`/watches/${watch.id}`] });
    const page = (
      <Router history={history}>
        <Route path="/watches/:watchId" component={WatchDetailPage} />
      </Router>
    );
    return { ...render(page), page };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    watch = createMockWatch({
      id: 'security-watch-test',
      description: 'Initial description',
      scheduleInterval: '90s',
      triggers: [
        { type: 'schedule', summary: 'Every 90 seconds' },
        { type: 'manual', summary: 'Manual' },
      ],
    });
    mockUseWatch.mockImplementation(() => ({
      data: { watch },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    }));
    mockMutateAsync.mockImplementation(async ({ body }: { body: WatchSettings }) => ({
      watch: createMockWatch({ ...watch, ...body }),
    }));
  });

  it('preserves a non-preset interval and sends the complete settings body', async () => {
    renderPage();

    expect(screen.getByTestId('pndWatchScheduleInterval')).toHaveValue('90s');
    fireEvent.change(screen.getByTestId('pndWatchDescription'), {
      target: { value: 'Updated description' },
    });
    fireEvent.click(screen.getByTestId('pndWatchSaveButton'));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        watchId: watch.id,
        body: {
          enabled: true,
          description: 'Updated description',
          autonomyLevel: 'assisted',
          scheduleInterval: '90s',
        },
      })
    );
  });

  it('does not replace unsaved edits when watch data refetches', () => {
    const { rerender, page } = renderPage();

    fireEvent.change(screen.getByTestId('pndWatchDescription'), {
      target: { value: 'Unsaved description' },
    });
    watch = createMockWatch({
      ...watch,
      description: 'Refetched description',
    });
    rerender(page);

    expect(screen.getByTestId('pndWatchDescription')).toHaveValue('Unsaved description');
  });

  it('keeps managed watches read-only', () => {
    watch = createMockWatch({ ...watch, managed: true });
    renderPage();

    expect(screen.getByTestId('pndWatchDescription')).toBeDisabled();
    expect(screen.queryByTestId('pndWatchSaveButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('pndWatchEnabledSwitch')).toBeDisabled();
  });
});
