/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const MaintenanceModeCallout = () => {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.enterpriseSearch.maintenanceModeCallout.title', {
        defaultMessage: 'Maintenance Mode Notice',
      })}
    >
      <p>
        {i18n.translate('xpack.enterpriseSearch.maintenanceModeCallout.description', {
          defaultMessage:
            'Search Applications is in maintenance mode. It will not receive new features, but will continue to receive security updates and bug fixes.',
        })}
      </p>
    </EuiCallOut>
  );
};
