/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NoDataPage } from '@kbn/shared-ux-page-no-data';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import {
  getNoDataConfig,
  OnboardingFlow,
} from '../../../../components/shared/templates/no_data_config';

/** Renders the Hosts onboarding card as page body so AppHeader can stay mounted. */
export const HostsOnboardingPage = (): React.ReactElement | null => {
  const {
    services: { share, docLinks },
  } = useKibanaContextForPlugin();

  const noDataConfig = getNoDataConfig({
    hasData: false,
    loading: false,
    onboardingFlow: OnboardingFlow.Hosts,
    docsLink: docLinks.links.observability.guide,
    locators: share.url.locators,
  });

  if (!noDataConfig) {
    return null;
  }

  return <NoDataPage {...noDataConfig} />;
};
