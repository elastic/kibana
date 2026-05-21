/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';
import { OPEN_AWS_CATALOG_OVERVIEW_LOCATION_STATE } from '../shared/use_data_sources_catalog_flyout';
import { AwsOnboardingPage } from './aws_onboarding_page';

/** Opens the AWS catalog overview flyout on the Add data landing page, or falls back to the legacy wizard. */
export const AwsIntegrationCatalogRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { streamsApp } = useKibana<ObservabilityOnboardingAppServices>().services;

  useEffect(() => {
    if (streamsApp?.DataSourcesCatalogFlyout) {
      navigate('/', {
        replace: true,
        state: { [OPEN_AWS_CATALOG_OVERVIEW_LOCATION_STATE]: true },
      });
    }
  }, [navigate, streamsApp?.DataSourcesCatalogFlyout]);

  if (streamsApp?.DataSourcesCatalogFlyout) {
    return null;
  }

  return <AwsOnboardingPage />;
};
