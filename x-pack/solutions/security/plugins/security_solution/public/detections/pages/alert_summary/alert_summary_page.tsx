/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import React from 'react';
import { useFetchIntegrations } from '../../hooks/alert_summary/use_fetch_integrations';
import { LandingPage } from '../../components/alert_summary/landing_page/landing_page';
import { Wrapper } from '../../components/alert_summary/wrapper';
import { LOADING_INTEGRATIONS } from './translations';

/**
 *
 */
export const AlertSummaryPage = () => {
  const { availableInstalledPackage, installedPackages, isLoading } = useFetchIntegrations();

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
        title={<h2>{LOADING_INTEGRATIONS}</h2>}
      />
    );
  }

  // TODO don't forget to put back === here instead of >
  if (installedPackages.length > 0) {
    return <LandingPage packages={availableInstalledPackage} />;
  }

  return <Wrapper packages={installedPackages} />;
};

AlertSummaryPage.displayName = 'AlertSummaryPage';
