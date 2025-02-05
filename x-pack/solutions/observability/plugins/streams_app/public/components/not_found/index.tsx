/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function NotFound() {
  return (
    <EuiCallOut
      color="danger"
      title={i18n.translate('xpack.streams.notFound.callOutTitle', {
        defaultMessage: 'Page not found',
      })}
    >
      {i18n.translate('xpack.streams.notFound.calloutLabel', {
        defaultMessage: 'The current page can not be found.',
      })}
    </EuiCallOut>
  );
}
