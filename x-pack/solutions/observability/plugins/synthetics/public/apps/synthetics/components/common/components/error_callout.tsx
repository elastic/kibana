/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { IHttpSerializedFetchError } from '../../../state';

/**
 * Use this component when displaying fetch-related errors.
 */
export function ErrorCallout(error: IHttpSerializedFetchError<unknown>) {
  return (
    <EuiCallOut
      color="danger"
      title={i18n.translate('xpack.synthetics.monitorDetail.errorTitle', {
        defaultMessage: 'Error fetching monitor details',
      })}
      iconType="alert"
    >
      <p>
        {i18n.translate('xpack.synthetics.monitorDetailFlyout.fetchError.description', {
          defaultMessage: 'Unable to fetch monitor details',
        })}
      </p>
      {error.body?.message && (
        <p>
          {i18n.translate('xpack.synthetics.monitorDetailFlyout.fetchError.message', {
            defaultMessage: 'Message: {message}',
            values: { message: error.body.message },
          })}
        </p>
      )}
      {error.body?.error && (
        <p>
          {i18n.translate('xpack.synthetics.monitorDetailFlyout.fetchError.error', {
            defaultMessage: 'Error: {error}',
            values: { error: error.body.error },
          })}
        </p>
      )}
      {error.body?.statusCode && (
        <p>
          {i18n.translate('xpack.synthetics.monitorDetailFlyout.fetchError.statusCode', {
            defaultMessage: 'Status code: {statusCode}',
            values: { statusCode: error.body.statusCode },
          })}
        </p>
      )}
    </EuiCallOut>
  );
}
