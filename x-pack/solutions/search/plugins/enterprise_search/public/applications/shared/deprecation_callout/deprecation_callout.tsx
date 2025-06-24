/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DeprecationCallout = () => {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.enterpriseSearch.deprecationCallout.title', {
        defaultMessage: 'Deprecation Notice',
      })}
      color="warning"
    >
      <p>
        {i18n.translate('xpack.enterpriseSearch.deprecationCallout.description', {
          defaultMessage:
            'Behavioral Analytics has been deprecated and will be removed in a future release.',
        })}
      </p>
    </EuiCallOut>
  );
};
