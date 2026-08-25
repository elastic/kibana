/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt, EuiImage } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import noMlModelsGraphicDark from '../../../../assets/images/no_ml_models_dark.svg';

const ICON_WIDTH = 294;

interface AnalyticsCollectionNotFoundProps {
  query: string;
}

export const AnalyticsCollectionNotFound: React.FC<AnalyticsCollectionNotFoundProps> = ({
  query,
}) => (
  <EuiEmptyPrompt
    icon={<EuiImage size={ICON_WIDTH} src={noMlModelsGraphicDark} alt="icon" />}
    title={
      <h2>
        {i18n.translate('xpack.enterpriseSearch.analytics.collections.notFound.headingTitle', {
          defaultMessage: 'No results found for “{query}”',
          values: { query },
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.enterpriseSearch.analytics.collections.notFound.subHeading', {
          defaultMessage: 'Try searching for another term.',
        })}
      </p>
    }
  />
);
