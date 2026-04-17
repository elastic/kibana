/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { INGEST_HUB_APP_ID } from '@kbn/deeplinks-observability';
import type { ObservabilityOnboardingAppServices } from '../..';
import {
  UnifiedKubernetesPanel,
  type CollectorType,
} from '../quickstart_flows/unified_kubernetes/unified_kubernetes_panel';
import { PageTemplate } from './template';
import { CustomHeader } from '../header';
import { useFlowBreadcrumb } from '../shared/use_flow_breadcrumbs';

export const UnifiedKubernetesPage = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const collectorParam = params.get('collector');
  const defaultCollector: CollectorType =
    collectorParam === 'otel' ? 'kubernetes_otel' : 'kubernetes';

  const {
    services: { application },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useFlowBreadcrumb({
    text: i18n.translate('xpack.observability_onboarding.breadcrumbs.unifiedKubernetes', {
      defaultMessage: 'Kubernetes',
    }),
  });

  const onBackToIngestHub = useCallback(() => {
    application?.navigateToApp(INGEST_HUB_APP_ID);
  }, [application]);

  return (
    <PageTemplate
      customHeader={
        <CustomHeader
          logo="kubernetes"
          headlineCopy={i18n.translate(
            'xpack.observability_onboarding.unifiedKubernetesPage.header.headline',
            {
              defaultMessage: 'Monitor your Kubernetes cluster',
            }
          )}
          captionCopy={i18n.translate(
            'xpack.observability_onboarding.unifiedKubernetesPage.header.caption',
            {
              defaultMessage:
                'Set up Kubernetes monitoring using Elastic Agent or the Elastic Distribution for OpenTelemetry Collector',
            }
          )}
          onBack={onBackToIngestHub}
        />
      }
    >
      <UnifiedKubernetesPanel defaultCollector={defaultCollector} />
    </PageTemplate>
  );
};
