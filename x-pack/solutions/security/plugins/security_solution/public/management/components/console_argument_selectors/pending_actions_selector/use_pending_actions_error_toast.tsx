/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { IHttpFetchError } from '@kbn/core/public';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { PendingActionsErrorType } from '../../../hooks/response_actions/use_get_pending_actions';

/**
 * Shows a danger toast with details if pendingActionsError is present.
 * @param pendingActionsError Error object from pending actions fetch
 * @param notifications Kibana notifications service
 */
export const usePendingActionsErrorToast = (
  pendingActionsError: IHttpFetchError<PendingActionsErrorType> | null,
  notifications: NotificationsStart
) => {
  useEffect(() => {
    if (pendingActionsError) {
      let code = 'Error';
      let message: string | undefined;

      const err = pendingActionsError;
      if (err?.body?.message) {
        message = err.body.message;
        code = String(err.body.statusCode ?? code);
      } else {
        message = err?.message || String(err);
      }

      if (message) {
        notifications.toasts.addDanger({
          title: `Error loading pending actions: ${code}`,
          text: message,
        });
      }
    }
  }, [pendingActionsError, notifications]);
};