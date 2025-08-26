/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IHttpFetchError } from '@kbn/core/public';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { BaseSelectorState } from './types';

/**
 * Generic error toast hook that handles both custom scripts and pending actions errors
 */
export const useGenericErrorToast = (
  error: IHttpFetchError<unknown> | null,
  notifications: NotificationsStart,
  errorTitlePrefix?: string
) => {
  useEffect(() => {
    if (error) {
      let code = 'Error';
      let message: string | undefined;

      const err = error;
      if (err?.body?.message) {
        message = err.body.message;
        code = String(err.body.statusCode ?? code);
      } else {
        message = err?.message || String(err);
      }

      if (message) {
        const titlePrefix = errorTitlePrefix ? `${errorTitlePrefix}: ` : '';
        notifications.toasts.addDanger({
          title: `${titlePrefix}Error ${code}`,
          text: message,
        });
      }
    }
  }, [error, notifications, errorTitlePrefix]);
};

/**
 * Hook to manage base selector state
 */
export const useBaseSelectorState = <T extends BaseSelectorState>(
  store: T | undefined,
  value: string | undefined
) => {
  return useMemo<T>(() => {
    return (store ?? { isPopoverOpen: !value }) as T;
  }, [store, value]);
};

/**
 * Hook to create base selector handlers
 */
export const useBaseSelectorHandlers = <T extends BaseSelectorState>(
  state: T,
  onChange: Function,
  value: string,
  valueText: string
) => {
  const setIsPopoverOpen = useCallback(
    (newValue: boolean) => {
      onChange({
        value,
        valueText,
        store: {
          ...state,
          isPopoverOpen: newValue,
        },
      });
    },
    [onChange, state, value, valueText]
  );

  const handleOpenPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, [setIsPopoverOpen]);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  return {
    setIsPopoverOpen,
    handleOpenPopover,
    handleClosePopover,
  };
};

/**
 * Hook to manage render delay state (handles race condition with parent input)
 */
export const useRenderDelay = () => {
  const [isAwaitingRenderDelay, setIsAwaitingRenderDelay] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAwaitingRenderDelay(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return isAwaitingRenderDelay;
};

/**
 * Hook to handle focus management when popover closes
 */
export const useFocusManagement = (isPopoverOpen: boolean, requestFocus?: () => void) => {
  useEffect(() => {
    if (!isPopoverOpen && requestFocus) {
      // Use setTimeout to ensure focus happens after the popover closes
      setTimeout(() => {
        requestFocus();
      }, 0);
    }
  }, [isPopoverOpen, requestFocus]);
};
