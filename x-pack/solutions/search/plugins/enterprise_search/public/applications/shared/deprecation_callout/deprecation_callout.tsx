/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { KbnWarningCallout } from '@kbn/ui-callout';

export const DeprecationCallout = () => {
  return (
    <KbnWarningCallout
      title={i18n.translate('xpack.enterpriseSearch.deprecationCallout.title', {
        defaultMessage: 'Deprecation Notice',
      })}
      text={i18n.translate('xpack.enterpriseSearch.deprecationCallout.description', {
        defaultMessage:
          'Behavioral Analytics has been deprecated and will be removed in a future release.',
      })}
    />
  );
};
