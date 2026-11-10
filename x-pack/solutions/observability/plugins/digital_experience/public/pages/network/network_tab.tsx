/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationNetworkResponse } from '../../../common/types/network';
import { ApplicationTabToolbar } from '../../components/application_tab_toolbar';
import { LoadErrorPrompt } from '../../components/load_error_prompt';
import { NETWORK_EBT_ELEMENTS } from '../../ebt_constants';
import type { ApplicationRequest } from '../../hooks/use_application_data';
import { useApplicationData } from '../../hooks/use_application_data';
import { useLastEnvironments } from '../../hooks/use_last_environments';
import { HttpRequestsPanel } from './components/http_requests_panel';
import { SlowestResourcesPanel } from './components/slowest_resources_panel';

const FETCH_ERROR_TITLE = i18n.translate('xpack.digitalExperience.network.fetchErrorTitle', {
  defaultMessage: 'Could not load the requests and resources',
});

const networkRequest: ApplicationRequest<ApplicationNetworkResponse> = (apiClient, options) => {
  return apiClient.fetch(
    'GET /internal/digital_experience/applications/{serviceName}/network',
    options
  );
};

/** The HTTP requests and slowest resources of one EDOT Browser application. */
export function NetworkTab({ serviceName }: { serviceName: string }) {
  const { response, isLoading, error, refresh } = useApplicationData(serviceName, networkRequest);
  const environments = useLastEnvironments(serviceName, response);
  const resources = response?.slowestResources ?? [];

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
          data-test-subj="digitalExperienceNetworkError"
          retryDataTestSubj="digitalExperienceNetworkRetry"
          retryEbtElement={NETWORK_EBT_ELEMENTS.RETRY}
          title={FETCH_ERROR_TITLE}
          error={error}
          onRetry={refresh}
        />
      ) : (
        <>
          <HttpRequestsPanel requests={response?.httpRequests ?? []} isLoading={isLoading} />
          <EuiSpacer size="m" />
          <SlowestResourcesPanel resources={resources} isLoading={isLoading} />
        </>
      )}
    </>
  );
}
