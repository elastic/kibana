/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFetchIntegrations } from '../../hooks/alert_summary/use_fetch_integrations';
import { LandingPage } from '../../components/alert_summary/landing_page/landing_page';
import { Wrapper } from '../../components/alert_summary/wrapper';

export const LOADING_INTEGRATIONS_TEST_ID = 'alert-summary-loading-integrations';

const LOADING_INTEGRATIONS = i18n.translate('xpack.securitySolution.alertSummary.loading', {
  defaultMessage: 'Loading integrations',
});

/**
 *
 */
export const AlertSummaryPage = () => {
  const { availableInstalledPackage, installedPackages, isLoading } = useFetchIntegrations();

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        data-test-subj={LOADING_INTEGRATIONS_TEST_ID}
        icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
        title={<h2>{LOADING_INTEGRATIONS}</h2>}
      />
    );
  }

  // TODO don't forget to put back === here instead of >
  if (installedPackages.length > 0) {
    return <LandingPage packages={availableInstalledPackage} />;
  }

  // TODO don't forget to put back installedPackages instead of availableInstalledPackage
  return <Wrapper packages={availableInstalledPackage} />;
};

AlertSummaryPage.displayName = 'AlertSummaryPage';
