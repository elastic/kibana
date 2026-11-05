/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ApplicationTabToolbar } from '../../components/application_tab_toolbar';
import { LoadErrorPrompt } from '../../components/load_error_prompt';
import { ERRORS_EBT_ELEMENTS } from '../../ebt_constants';
import { useLastEnvironments } from '../../hooks/use_last_environments';
import { JsErrorsPanel } from './components/js_errors_panel';
import { useApplicationErrors } from './hooks/use_application_errors';

/** Shown on the Errors tab and in place of the Overview's top errors. */
export const ERRORS_FETCH_ERROR_TITLE = i18n.translate(
  'xpack.digitalExperience.errors.fetchErrorTitle',
  { defaultMessage: 'Could not load the errors' }
);

/** The JS errors of one EDOT Browser application, grouped, with their stack trace. */
export function ErrorsTab({ serviceName }: { serviceName: string }) {
  const { response, isLoading, error, refresh } = useApplicationErrors(serviceName);
  const environments = useLastEnvironments(serviceName, response);

  return (
    <>
      <EuiSpacer size="m" />
      <ApplicationTabToolbar
        environments={environments}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      <EuiSpacer size="m" />
      {error ? (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceErrorsError"
          retryDataTestSubj="digitalExperienceErrorsRetry"
          retryEbtElement={ERRORS_EBT_ELEMENTS.RETRY}
          title={ERRORS_FETCH_ERROR_TITLE}
          error={error}
          onRetry={refresh}
        />
      ) : (
        <JsErrorsPanel
          errors={response?.errors ?? []}
          hasMoreErrors={response?.hasMoreErrors}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
