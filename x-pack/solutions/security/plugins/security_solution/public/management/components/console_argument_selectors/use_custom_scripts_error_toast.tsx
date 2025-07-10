/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { KibanaReactNotifications } from '@kbn/kibana-react-plugin/public';
import { IHttpFetchError } from '@kbn/core/public';
import { CustomScriptsErrorType } from '../../hooks/custom_scripts/use_get_custom_scripts';

/**
 * Shows a danger toast with details if scriptsError is present.
 * @param scriptsError Error object from custom scripts fetch
 * @param notifications Kibana notifications service
 */
export const useCustomScriptsErrorToast = (
  scriptsError: IHttpFetchError<CustomScriptsErrorType> | null,
  notifications: KibanaReactNotifications
) => {
  useEffect(() => {
    if (scriptsError) {
      let code = 'Error';
      let message: string | undefined;

      const err = scriptsError;
      if (err?.body?.message) {
        const { error } = getMessageFieldFromStringifiedObject(err.body.message) || {};
        if (error) {
          code = error.code || code;
          message = error.message;
        } else {
          code = err.body.statusCode ? String(err.body.statusCode) : code;
          message = err.body.message;
        }
      } else {
        message = err?.message || String(err);
      }

      if (message) {
        notifications.toasts.danger({
          title: code,
          body: (
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.customScripts.fetchError"
                  defaultMessage="Failed to fetch Microsoft Defender for Endpoint scripts"
                />
              </p>
              <p>{message}</p>
            </EuiText>
          ),
        });
      }
    }
  }, [scriptsError, notifications]);
};
export function getMessageFieldFromStringifiedObject(
  str: string
): { error: { code: string; message: string } } | undefined {
  const marker = 'Response body: ';
  const idx = str.indexOf(marker);
  if (idx === -1) return undefined;

  const jsonPart = str.slice(idx + marker.length).trim();
  try {
    return JSON.parse(jsonPart);
  } catch {
    return undefined;
  }
}
