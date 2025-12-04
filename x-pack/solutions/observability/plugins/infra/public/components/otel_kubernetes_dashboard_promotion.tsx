/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCard } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { TryItButton } from './try_it_button';
import { useInstalledIntegration } from '../hooks/use_installed_integration';

export const OtelKubernetesDashboardCard = () => {
  const { isInstalled } = useInstalledIntegration('kubernetes_otel');
  return (
    <EuiCard
      title={i18n.translate(
        'xpack.infra.otelKubernetesDashboardCard.euiCard.otelKubernetesDashboardLabel',
        { defaultMessage: 'Otel Kubernetes Dashboard' }
      )}
      description={
        isInstalled
          ? 'View your Otel Kubernetes dashboard'
          : 'Install the Otel Kubernetes integration to view your Otel Kubernetes dashboard'
      }
    />
  );
};
const LOCAL_STORAGE_KEY = 'inventoryUI:otelK8sDashboardClicked';

export const OtelKubernetesButton = () => {
  const [clicked, setClicked] = useLocalStorage<boolean>(LOCAL_STORAGE_KEY, false);
  const clickedRef = useRef<boolean | undefined>(clicked);
  return (
    <TryItButton
      color={clickedRef.current ? 'primary' : 'accent'}
      label={i18n.translate('xpack.infra.bottomDrawer.otelKubernetesDashboardsLink', {
        defaultMessage: 'Otel Kubernetes dashboards',
      })}
      data-test-subj="inventory-kubernetesDashboard-link"
      link={{
        app: 'dashboards',
        hash: '/list',
        search: {
          _g: '()',
          s: 'kubernetes tag:(Managed)',
        },
      }}
      onClick={() => {
        if (!clickedRef.current) {
          setClicked(true);
        }
      }}
      hideBadge={clickedRef.current}
    />
  );
};
