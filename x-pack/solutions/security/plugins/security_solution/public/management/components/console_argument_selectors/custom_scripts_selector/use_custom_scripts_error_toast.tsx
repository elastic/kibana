/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { IHttpFetchError } from '@kbn/core/public';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { CustomScriptsErrorType } from '../../../hooks/custom_scripts/use_get_custom_scripts';

/**
 * Shows a danger toast with details if scriptsError is present.
 * @param scriptsError Error object from custom scripts fetch
 * @param notifications Kibana notifications service
 */
export const useCustomScriptsErrorToast = (
  scriptsError: IHttpFetchError<CustomScriptsErrorType> | null,
  notifications: NotificationsStart
) => {
  useEffect(() => {
    if (scriptsError) {
      let code = 'Error';
      let message: string | undefined;

      const err = scriptsError;
      if (err?.body?.message) {
        message = err.body.message;
        code = String(err.body.statusCode ?? code);
      } else {
        message = err?.message || String(err);
      }

      if (message) {
        notifications.toasts.addDanger({
          title: `Error: ${code}`,
          text: message,
        });
      }
    }
  }, [scriptsError, notifications]);
};
