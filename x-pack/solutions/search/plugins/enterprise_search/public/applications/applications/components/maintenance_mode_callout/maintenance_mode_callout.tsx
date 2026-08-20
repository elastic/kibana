/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { KbnInfoCallout } from '@kbn/ui-callout';

export const MaintenanceModeCallout = () => {
  return (
    <KbnInfoCallout
      title={i18n.translate('xpack.enterpriseSearch.maintenanceModeCallout.title', {
        defaultMessage: 'Maintenance Mode Notice',
      })}
      text={i18n.translate('xpack.enterpriseSearch.maintenanceModeCallout.description', {
        defaultMessage:
          'Search applications is in maintenance mode and will only receive security updates and bug fixes in future releases.',
      })}
    />
  );
};
