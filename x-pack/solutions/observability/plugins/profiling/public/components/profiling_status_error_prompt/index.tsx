/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../profiling_app_page_template';

interface ErrorResponseBody {
  message?: string;
  attributes?: { cause?: string };
}

const STATUS_ERROR_TITLE = i18n.translate('xpack.profiling.statusError.title', {
  defaultMessage: 'Unable to load the profiling status',
});

// The message of an HTTP fetch error is only the status text. The server-side cause is in the
// response body, so it is moved into the error shown by the details dialog.
const toDetailedError = (error: Error): Error => {
  if (!isHttpFetchError(error)) {
    return error;
  }

  const body = error.body as ErrorResponseBody | undefined;
  const cause = body?.attributes?.cause ?? body?.message;
  return cause ? new Error(cause) : error;
};

export function ProfilingStatusErrorPrompt({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const {
    start: {
      core: { notifications },
    },
  } = useProfilingDependencies();

  return (
    <ProfilingAppPageTemplate hideSearchBar suppressMenu>
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        data-test-subj="profilingStatusErrorPrompt"
        title={<h2>{STATUS_ERROR_TITLE}</h2>}
        body={
          <p>
            {i18n.translate('xpack.profiling.statusError.description', {
              defaultMessage:
                'Kibana could not check the status of the plugin. Try again, or contact your administrator if the problem persists.',
            })}
          </p>
        }
        actions={[
          <EuiButton
            data-test-subj="profilingStatusErrorRetryButton"
            color="danger"
            fill
            onClick={onRetry}
          >
            {i18n.translate('xpack.profiling.statusError.retryButtonLabel', {
              defaultMessage: 'Try again',
            })}
          </EuiButton>,
          <EuiButtonEmpty
            data-test-subj="profilingStatusErrorDetailsButton"
            color="danger"
            onClick={() =>
              notifications.showErrorDialog({
                title: STATUS_ERROR_TITLE,
                error: toDetailedError(error),
              })
            }
          >
            {i18n.translate('xpack.profiling.statusError.viewDetailsButtonLabel', {
              defaultMessage: 'View details',
            })}
          </EuiButtonEmpty>,
        ]}
      />
    </ProfilingAppPageTemplate>
  );
}
