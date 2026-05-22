/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useFetchEndpointPackageFreshness } from '../../../../hooks/insights/use_fetch_endpoint_package_freshness';
import { WORKFLOW_INSIGHTS } from '../../../../translations';

const STORAGE_KEY_PREFIX =
  'securitySolution.endpointHosts.workflowInsightsAB.stalePackageBannerDismissed';

export const StaleEndpointPackageBanner = () => {
  const { data } = useFetchEndpointPackageFreshness();

  const latestVersion = data?.latestVersion ?? 'unknown';
  const storageKey = `${STORAGE_KEY_PREFIX}.${latestVersion}`;

  const [dismissed, setDismissed] = useLocalStorage<boolean>(storageKey, false);

  if (data === undefined || !data.stale || dismissed) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={WORKFLOW_INSIGHTS.stalePackageBanner.title}
        color="warning"
        iconType="warning"
        onDismiss={() => setDismissed(true)}
      >
        <p>
          {WORKFLOW_INSIGHTS.stalePackageBanner.description(
            data.installedVersion ?? '',
            data.latestVersion ?? ''
          )}
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
