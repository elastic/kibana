/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../ebt_constants';

const RETRY_LABEL = i18n.translate('xpack.digitalExperience.loadError.retryButtonLabel', {
  defaultMessage: 'Try again',
});

/** A page's data failed to load: the error and a button to load it again. */
export function LoadErrorPrompt({
  title,
  error,
  onRetry,
  retryEbtElement,
  'data-test-subj': dataTestSubj,
  retryDataTestSubj,
}: {
  title: string;
  error: Error;
  onRetry: () => void;
  retryEbtElement: string;
  'data-test-subj': string;
  retryDataTestSubj: string;
}) {
  return (
    <EuiEmptyPrompt
      data-test-subj={dataTestSubj}
      iconType="warning"
      color="danger"
      title={<h2>{title}</h2>}
      body={<p>{error.message}</p>}
      actions={
        <EuiButton
          data-test-subj={retryDataTestSubj}
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.RETRY_LOAD,
            element: retryEbtElement,
          })}
          onClick={onRetry}
        >
          {RETRY_LABEL}
        </EuiButton>
      }
    />
  );
}
