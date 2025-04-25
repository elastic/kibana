/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { withLazyHook } from '../../../components/with_lazy_hook';
import { LOADING_SKELETON_TEXT_LINES } from '../constants';
import { AvailableIntegrationsComponent } from './available_integrations';

export const WithFilteredIntegrations = withLazyHook(
  AvailableIntegrationsComponent,
  () => import('@kbn/fleet-plugin/public').then((module) => module.AvailablePackagesHook()),
  <EuiSkeletonText
    data-test-subj="loadingPackages"
    isLoading={true}
    lines={LOADING_SKELETON_TEXT_LINES}
  />
);
