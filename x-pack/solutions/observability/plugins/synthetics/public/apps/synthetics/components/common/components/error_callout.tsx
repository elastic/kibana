/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { IHttpSerializedFetchError } from '../../../state';

/**
 * Use this component when displaying fetch-related errors.
 */
export function ErrorCallout(error: IHttpSerializedFetchError<unknown>) {
  const listItems = [];
  if (error.body?.statusCode) {
    listItems.push({
      title: i18n.translate('xpack.synthetics.monitorDetailFlyout.fetchError.statusCode', {
        defaultMessage: 'Status:',
      }),
      description: error.body.statusCode,
    });
  }
  if (error.body?.error) {
    listItems.push({
      title: i18n.translate('xpack.synthetics.monitorDetailFlyout.fetchError.error', {
        defaultMessage: 'Error:',
      }),
      description: error.body.error,
    });
  }
  if (error.body?.message) {
    listItems.push({
      title: i18n.translate('xpack.synthetics.monitorDetailFlyout.fetchError.messageTitle', {
        defaultMessage: 'Message:',
      }),
      description: error.body.message,
    });
  }
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

      {listItems.length > 0 && (
        <EuiDescriptionList compressed type="responsiveColumn" listItems={listItems} />
      )}
    </EuiCallOut>
  );
}
