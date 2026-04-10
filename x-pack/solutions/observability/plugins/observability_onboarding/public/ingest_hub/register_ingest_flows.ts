/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ObservabilityOnboardingPluginStartDeps } from '../plugin';
import { PLUGIN_ID } from '../../common';

export const registerIngestFlows = (plugins: ObservabilityOnboardingPluginStartDeps) => {
  plugins.ingestHub?.registerIngestFlow({
    id: 'kubernetes',
    title: i18n.translate('xpack.observability_onboarding.ingestHub.kubernetes.title', {
      defaultMessage: 'Kubernetes',
    }),
    description: i18n.translate('xpack.observability_onboarding.ingestHub.kubernetes.description', {
      defaultMessage: 'Monitor your Kubernetes cluster with Elastic Agent',
    }),
    icon: 'logoKubernetes',
    category: i18n.translate('xpack.observability_onboarding.ingestHub.category.containers', {
      defaultMessage: 'Containers',
    }),
    navigateTo: { appId: PLUGIN_ID, path: '/kubernetes/?category=kubernetes' },
  });
};
