/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import { useKibana } from '../../hooks/use_kibana';
import { useFileUploadFlyout } from './use_file_upload_flyout';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

describe('useFileUploadFlyout', () => {
  const setup = ({
    hasUiActions = true,
    hasAction = true,
  }: { hasUiActions?: boolean; hasAction?: boolean } = {}) => {
    const executeTriggerActions = jest.fn().mockResolvedValue(undefined);
    const hasActionMock = jest.fn(() => hasAction);
    mockUseKibana.mockReturnValue({
      services: {
        uiActions: hasUiActions ? { hasAction: hasActionMock, executeTriggerActions } : undefined,
      },
    });
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useFileUploadFlyout(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    const getContext = (): OpenFileUploadLiteContext => executeTriggerActions.mock.calls[0][1];

    return {
      flyout: result.current,
      executeTriggerActions,
      getContext,
      hasAction: hasActionMock,
      invalidateQueries,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is unavailable without the UI actions plugin', async () => {
    const { flyout } = setup({ hasUiActions: false });

    expect(flyout.isAvailable).toBe(false);
    await expect(flyout.open()).rejects.toThrow();
  });

  it('is unavailable where no plugin registered the file upload action', async () => {
    const { flyout, executeTriggerActions, hasAction } = setup({ hasAction: false });

    expect(hasAction).toHaveBeenCalledWith('openFileUploadLiteTrigger');
    expect(flyout.isAvailable).toBe(false);
    await expect(flyout.open()).rejects.toThrow();
    expect(executeTriggerActions).not.toHaveBeenCalled();
  });

  it('opens the flyout through the file upload trigger', async () => {
    const { flyout, executeTriggerActions } = setup();

    expect(flyout.isAvailable).toBe(true);
    await flyout.open();

    expect(executeTriggerActions).toHaveBeenCalledWith('OPEN_FILE_UPLOAD_LITE_TRIGGER', {
      location: 'search-homepage',
      onUploadComplete: expect.any(Function),
    });
  });

  it('focuses the control that asked, for the flyout to return the focus to', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    const { flyout, executeTriggerActions } = setup();
    executeTriggerActions.mockImplementation(async () => {
      expect(opener).toHaveFocus();
    });

    await flyout.open(opener);

    expect(executeTriggerActions).toHaveBeenCalledTimes(1);
  });

  it('re-reads the cluster state once an upload is done', async () => {
    const { flyout, getContext, invalidateQueries } = setup();

    await flyout.open();
    expect(invalidateQueries).not.toHaveBeenCalled();

    getContext().onUploadComplete?.({ index: 'uploaded', files: [] });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['searchHomepageAnalyticsClusterState'],
    });
  });
});
