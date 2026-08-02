/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_APP_ID, useWorkflowsDeepLink } from '.';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;

const DEEP_LINK_PATH =
  '/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId=step-1';

describe('useWorkflowsDeepLink', () => {
  const mockGetUrlForApp = jest.fn();
  const mockNavigateToApp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrlForApp.mockReturnValue(`/s/agent-3/app/workflows${DEEP_LINK_PATH}`);
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: mockGetUrlForApp,
          navigateToApp: mockNavigateToApp,
        },
      },
    });
  });

  it('returns the url built by getUrlForApp, which applies the space prefix', () => {
    const { result } = renderHook(() => useWorkflowsDeepLink(DEEP_LINK_PATH));

    expect(result.current.url).toBe(`/s/agent-3/app/workflows${DEEP_LINK_PATH}`);
  });

  it('asks getUrlForApp for the workflows app and never hand-builds the path', () => {
    renderHook(() => useWorkflowsDeepLink(DEEP_LINK_PATH));

    expect(mockGetUrlForApp).toHaveBeenCalledWith(WORKFLOWS_APP_ID, { path: DEEP_LINK_PATH });
  });

  it('returns a null url when the deep link path is undefined', () => {
    const { result } = renderHook(() => useWorkflowsDeepLink(undefined));

    expect(result.current.url).toBeNull();
  });

  it('returns a null url when the deep link path is null', () => {
    const { result } = renderHook(() => useWorkflowsDeepLink(null));

    expect(result.current.url).toBeNull();
  });

  it('returns a null url when the deep link path is empty', () => {
    const { result } = renderHook(() => useWorkflowsDeepLink(''));

    expect(result.current.url).toBeNull();
  });

  it('does not call getUrlForApp when there is no deep link path', () => {
    renderHook(() => useWorkflowsDeepLink(undefined));

    expect(mockGetUrlForApp).not.toHaveBeenCalled();
  });

  it('does NOT throw when the workflows app is unregistered', () => {
    mockGetUrlForApp.mockImplementation(() => {
      throw new Error('Application workflows is not registered');
    });

    expect(() => renderHook(() => useWorkflowsDeepLink(DEEP_LINK_PATH))).not.toThrow();
  });

  it('returns a null url when the workflows app is unregistered', () => {
    mockGetUrlForApp.mockImplementation(() => {
      throw new Error('Application workflows is not registered');
    });

    const { result } = renderHook(() => useWorkflowsDeepLink(DEEP_LINK_PATH));

    expect(result.current.url).toBeNull();
  });

  it('returns a null url when application is unavailable', () => {
    mockUseKibana.mockReturnValue({ services: {} });

    const { result } = renderHook(() => useWorkflowsDeepLink(DEEP_LINK_PATH));

    expect(result.current.url).toBeNull();
  });

  it('navigates through navigateToApp so the space prefix is applied', () => {
    const { result } = renderHook(() => useWorkflowsDeepLink(DEEP_LINK_PATH));

    result.current.navigate();

    expect(mockNavigateToApp).toHaveBeenCalledWith(WORKFLOWS_APP_ID, {
      openInNewTab: true,
      path: DEEP_LINK_PATH,
    });
  });

  it('does not navigate when the workflows app is unregistered', () => {
    mockGetUrlForApp.mockImplementation(() => {
      throw new Error('Application workflows is not registered');
    });

    const { result } = renderHook(() => useWorkflowsDeepLink(DEEP_LINK_PATH));
    result.current.navigate();

    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });

  it('does not navigate without a deep link path', () => {
    const { result } = renderHook(() => useWorkflowsDeepLink(undefined));

    result.current.navigate();

    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });
});
