/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { KbnWarningCallout } from '@kbn/ui-callout';

interface BetaCallOutProps {
  description: string;
  title?: string;
}

export const BetaCallOut: React.FC<BetaCallOutProps> = ({ title, description }) => {
  return (
    <KbnWarningCallout
      title={
        title ||
        i18n.translate('xpack.enterpriseSearch.betaCalloutTitle', {
          defaultMessage: 'Beta feature',
        })
      }
      text={description}
    />
  );
};
