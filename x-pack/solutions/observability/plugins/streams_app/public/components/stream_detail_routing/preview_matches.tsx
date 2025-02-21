/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiLoadingSpinner, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AsyncSample } from '../../hooks/queries/use_async_sample';

const matchText = i18n.translate('xpack.streams.streamRouting.previewMatchesText', {
  defaultMessage: 'Approximate match rate',
});

const errorText = i18n.translate('xpack.streams.streamRouting.previewMatchesErrorText', {
  defaultMessage: 'Error loading match rate',
});

export const PreviewMatches = ({
  approximateMatchingPercentage,
  error,
  isLoading,
}: {
  approximateMatchingPercentage: AsyncSample['approximateMatchingPercentage'];
  error: AsyncSample['documentCountsError'];
  isLoading: AsyncSample['isLoadingDocumentCounts'];
}) => {
  if (isLoading) {
    return (
      <EuiText size="xs" textAlign="center">
        {`${matchText}: `}
        <EuiLoadingSpinner size="s" />
      </EuiText>
    );
  }

  if (error) {
    return (
      <EuiText size="xs" textAlign="center">
        {`${matchText}: `}
        {errorText}
      </EuiText>
    );
  }

  if (approximateMatchingPercentage) {
    return (
      <EuiText size="xs" textAlign="center">
        {`${matchText}: `}
        {`${approximateMatchingPercentage}%`}
        <InfoTooltip />
      </EuiText>
    );
  }

  return null;
};

const InfoTooltip = () => {
  return (
    <EuiIconTip
      aria-label={i18n.translate('xpack.streams.streamRouting.previewMatchesTooltipAriaLabel', {
        defaultMessage: 'Additional information',
      })}
      type={'questionInCircle'}
      content={i18n.translate('xpack.streams.streamRouting.previewMatchesTooltipText', {
        defaultMessage:
          'Approximate percentage of documents matching this condition over a random sample of documents.',
      })}
      iconProps={{ style: { verticalAlign: 'text-bottom', marginLeft: 2 } }}
    />
  );
};
