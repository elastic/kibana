/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiCodeBlock } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { AppMetricsTracker } from '../types';
import { getErrorMessage } from '../utils/get_error_message';

export interface SearchNotebookErrorProps {
  error: unknown;
  notebookId: string;
  usageTracker: AppMetricsTracker;
}

export const SearchNotebookError = ({
  error,
  notebookId,
  usageTracker,
}: SearchNotebookErrorProps) => {
  React.useEffect(() => {
    usageTracker.count(['notebookViewError', `error-${notebookId}`]);
  }, [usageTracker, notebookId]);

  return (
    <EuiEmptyPrompt
      iconType="warning"
      iconColor="danger"
      title={
        <h2>
          <FormattedMessage
            id="xpack.searchNotebooks.notebook.fetchError.title"
            defaultMessage="Error loading notebook"
          />
        </h2>
      }
      titleSize="l"
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.searchNotebooks.notebook.fetchError.body"
              defaultMessage="We can't fetch the notebook from Kibana due to the following error:"
            />
          </p>
          {error !== undefined && typeof error === 'object' ? (
            <EuiCodeBlock css={{ textAlign: 'left' }}>{JSON.stringify(error)}</EuiCodeBlock>
          ) : (
            <p>
              {getErrorMessage(
                error,
                i18n.translate('xpack.searchNotebooks.notebook.fetchError.unknownError', {
                  defaultMessage: 'Unknown error fetching notebook',
                })
              )}
            </p>
          )}
        </>
      }
    />
  );
};
