/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import moment from 'moment-timezone';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ArgSelectorState } from '../../console/types';
import type { BaseSelectorState } from './types';
import type { ActionListApiResponse, ActionDetails } from '../../../../../common/endpoint/types';
import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../../common/endpoint/service/response_actions/constants';
import { useDateFormat, useTimeZone } from '../../../../common/lib/kibana';
import { getGenericErrorMessage, getPendingActionDescription } from '../../../common/translations';

/**
 * Generic error toast hook that handles both custom scripts and pending actions errors
 */
export const useGenericErrorToast = (
  error: IHttpFetchError<unknown> | null,
  notifications: NotificationsStart,
  errorTitlePrefix?: string
): void => {
  useEffect(() => {
    if (error) {
      let code = 'Error';
      let message: string | undefined;

      const err = error;
      if (err?.body && typeof err.body === 'object' && 'message' in err.body) {
        const errorBody = err.body as ResponseErrorBody;
        message = errorBody.message;
        code = String(errorBody.statusCode ?? code);
      } else {
        message = err?.message || String(err);
      }

      if (message) {
        notifications.toasts.addDanger({
          title: getGenericErrorMessage(errorTitlePrefix || '', code),
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
): T => {
  return useMemo<T>(() => {
    return (store ?? { isPopoverOpen: !value }) as T;
  }, [store, value]);
};

/**
 * Hook to create base selector handlers
 */
export const useBaseSelectorHandlers = <T extends BaseSelectorState>(
  state: T,
  onChange: (newData: ArgSelectorState<T>) => void,
  value: string,
  valueText: string
): {
  setIsPopoverOpen: (newValue: boolean) => void;
  handleOpenPopover: () => void;
  handleClosePopover: () => void;
} => {
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
export const useRenderDelay = (): boolean => {
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
export const useFocusManagement = (isPopoverOpen: boolean, requestFocus?: () => void): void => {
  const getIsMounted = useIsMounted();

  useEffect(() => {
    if (!isPopoverOpen && requestFocus) {
      // Use setTimeout to ensure focus happens after the popover closes
      setTimeout(() => {
        if (getIsMounted() && requestFocus) {
          requestFocus();
        }
      }, 0);
    }
  }, [isPopoverOpen, requestFocus, getIsMounted]);
};

/**
 * Format timestamp using user's preferred date format and timezone settings
 */
const formatTimestamp = (timestamp: string, dateFormat: string, timeZone: string): string => {
  return moment.tz(timestamp, timeZone).format(dateFormat);
};

/**
 * Hook to transform pending actions response to selectable options with user's preferred date formatting
 */
export const usePendingActionsOptions = ({
  response,
  selectedValue,
  privilegeChecker,
}: {
  response: ActionListApiResponse[] | null;
  selectedValue?: string;
  privilegeChecker?: (command: string) => { canCancel: boolean; reason?: string };
}): EuiSelectableOption<Partial<{ description: string }>>[] => {
  const dateFormat = useDateFormat();
  const timeZone = useTimeZone();

  return useMemo(() => {
    const data = response?.[0]?.data;
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((action: ActionDetails) => {
      const isChecked = action.id === selectedValue;
      const timestamp = formatTimestamp(action.startedAt, dateFormat, timeZone);
      const command = action.command;
      const createdBy = action.createdBy;

      // Use the console command name for display (e.g., 'release' instead of 'unisolate')
      const displayCommand =
        RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[
          command as ResponseActionsApiCommandNames
        ] || command;

      const description = getPendingActionDescription(action.id, createdBy, timestamp);

      // Check if user has permission to cancel this action
      const permissionCheck = privilegeChecker ? privilegeChecker(command) : { canCancel: false };
      const isDisabled = !permissionCheck.canCancel;

      return {
        label: displayCommand,
        value: action.id,
        description,
        data: action,
        checked: isChecked ? 'on' : undefined,
        disabled: isDisabled,
      };
    });
  }, [response, selectedValue, privilegeChecker, dateFormat, timeZone]);
};
