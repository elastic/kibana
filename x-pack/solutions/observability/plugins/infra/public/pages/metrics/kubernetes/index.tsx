/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiErrorBoundary } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const Kubernetes = () => {
  const {
    services: {
      observabilityShared: {
        navigation: { PageTemplate },
      },
    },
  } = useKibanaContextForPlugin();
  return (
    <EuiErrorBoundary>
      <PageTemplate
        pageHeader={{
          pageTitle: i18n.translate('xpack.infra.kubernetes.pageTitle', {
            defaultMessage: 'Kubernetes',
          }),
        }}
        data-test-subj="infraKubernetesPage"
      >
        <p>
          {i18n.translate('xpack.infra.kubernetes.p.dashboardsLabel', {
            defaultMessage: 'Dashboards:',
          })}
        </p>
      </PageTemplate>
    </EuiErrorBoundary>
  );
};
