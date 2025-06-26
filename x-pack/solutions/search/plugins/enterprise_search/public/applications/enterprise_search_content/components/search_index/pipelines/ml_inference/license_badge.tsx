/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export interface LicenseBadgeProps {
  licenseType: string;
  modelDetailsPageUrl?: string;
}

export const LicenseBadge: React.FC<LicenseBadgeProps> = ({ licenseType, modelDetailsPageUrl }) => {
  const licenseLabel = i18n.translate(
    'xpack.enterpriseSearch.content.indices.pipelines.modelSelectOption.licenseBadge.label',
    {
      defaultMessage: 'License: {licenseType}',
      values: {
        licenseType,
      },
    }
  );

  return (
    <EuiBadge color="hollow">
      {modelDetailsPageUrl ? (
        <EuiLink target="_blank" href={modelDetailsPageUrl}>
          {licenseLabel}
        </EuiLink>
      ) : (
        <p>{licenseLabel}</p>
      )}
    </EuiBadge>
  );
};
