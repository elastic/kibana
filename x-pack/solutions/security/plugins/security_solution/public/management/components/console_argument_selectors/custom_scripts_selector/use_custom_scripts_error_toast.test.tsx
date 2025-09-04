/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { IHttpFetchError } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { useCustomScriptsErrorToast } from './use_custom_scripts_error_toast';
import type { CustomScriptsErrorType } from '../../../hooks/custom_scripts/use_get_custom_scripts';

describe('useCustomScriptsErrorToast', () => {
  const mockToastDanger = jest.fn();
  const mockNotifications = {
    toasts: {
      addDanger: mockToastDanger,
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      add: jest.fn(),
    },
  } as unknown as NotificationsStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not show toast when no error is provided', () => {
    renderHook(() => useCustomScriptsErrorToast(null, mockNotifications));

    expect(mockToastDanger).not.toHaveBeenCalled();
  });

  test('shows toast with full error message from err.body.message', () => {
    const mockError: IHttpFetchError<CustomScriptsErrorType> = {
      name: 'HttpFetchError',
      message: 'HTTP Error',
      body: {
        statusCode: 403,
        message: 'Response body: {"error":{"code":"Forbidden","message":"Access denied"}}',
        meta: {} as ActionTypeExecutorResult<unknown>,
      },
      request: {} as unknown as Request,
      response: {} as unknown as Response,
    };

    renderHook(() => useCustomScriptsErrorToast(mockError, mockNotifications));

    expect(mockToastDanger).toHaveBeenCalledWith({
      title: 'Error: 403',
      text: expect.any(String),
    });
  });

  test('shows toast with status code when no parsed error is available', () => {
    const mockError: IHttpFetchError<CustomScriptsErrorType> = {
      name: 'HttpFetchError',
      message: 'HTTP Error',
      body: {
        statusCode: 500,
        message: 'Internal server error',
        meta: {} as ActionTypeExecutorResult<unknown>,
      },
      request: {} as unknown as Request,
      response: {} as unknown as Response,
    };

    renderHook(() => useCustomScriptsErrorToast(mockError, mockNotifications));

    expect(mockToastDanger).toHaveBeenCalledWith({
      title: 'Error: 500',
      text: expect.any(String),
    });
  });

  test('shows toast with error message when no body is available', () => {
    const mockError: IHttpFetchError<CustomScriptsErrorType> = {
      name: 'HttpFetchError',
      message: 'Network error',
      body: undefined,
      request: {} as unknown as Request,
      response: {} as unknown as Response,
    };

    renderHook(() => useCustomScriptsErrorToast(mockError, mockNotifications));

    expect(mockToastDanger).toHaveBeenCalledWith({
      title: 'Error: Error',
      text: expect.any(String),
    });
  });

  test('only shows toast once per error instance', () => {
    const mockError: IHttpFetchError<CustomScriptsErrorType> = {
      name: 'HttpFetchError',
      message: 'HTTP Error',
      body: {
        statusCode: 403,
        message: 'Access denied',
        meta: {} as ActionTypeExecutorResult<unknown>,
      },
      request: {} as unknown as Request,
      response: {} as unknown as Response,
    };

    const { rerender } = renderHook(() => useCustomScriptsErrorToast(mockError, mockNotifications));

    // Rerender with the same error - should not show toast again
    rerender();

    expect(mockToastDanger).toHaveBeenCalledTimes(1);
  });
});
