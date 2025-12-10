/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiButtonEmpty,
  EuiImage,
} from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { TryItButton } from '../try_it_button';
import { useInstalledIntegration } from '../../hooks/use_installed_integration';

export const OtelKubernetesDashboardCard = ({ onClose }: { onClose: () => void }) => {
  const { isInstalled } = useInstalledIntegration('kubernetes_otel');

  const handleClose = () => {
    onClose();
  };

  return (
    <EuiPanel hasBorder={true} paddingSize="m" color="subdued" grow={false} borderRadius="m">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiImage
            src="https://images.unsplash.com/photo-1650253618249-fb0d32d3865c?w=900&h=900&fit=crop&q=60"
            alt="Kubernetes OpenTelemetry Dashboards"
            size="s"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>
                  {isInstalled
                    ? i18n.translate(
                        'xpack.infra.inventoryUI.otelKubernetesPodsDashboard.integrationInstalledTitle',
                        {
                          defaultMessage: 'View Kubernetes OpenTelemetry Dashboards',
                        }
                      )
                    : i18n.translate(
                        'xpack.infra.inventoryUI.otelKubernetesPodsDashboard.integrationNotInstalledTitle',
                        {
                          defaultMessage: 'Install Kubernetes OpenTelemetry Dashboards',
                        }
                      )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {isInstalled
                  ? i18n.translate(
                      'xpack.infra.inventoryUI.otelKubernetesPodsDashboard.integrationInstalledDescription',
                      { defaultMessage: 'View your Kubernetes OpenTelemetry Dashboards' }
                    )
                  : i18n.translate(
                      'xpack.infra.inventoryUI.otelKubernetesPodsDashboard.integrationNotInstalledDescription',
                      {
                        defaultMessage:
                          'Install the Kubernetes OpenTelemetry Dashboards integration to view your Kubernetes OpenTelemetry Dashboards.',
                      }
                    )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    data-test-subj={
                      isInstalled
                        ? 'infraOtelKubernetesDashboardCardLink'
                        : 'infraOtelKubernetesDashboardCardInstallLink'
                    }
                    href={
                      isInstalled
                        ? 'https://www.elastic.co/guide/en/observability/current/kubernetes-otel-dashboards.html'
                        : 'https://www.elastic.co/guide/en/observability/current/kubernetes-otel-dashboards.html'
                    }
                    target="_blank"
                    rel="noopener"
                  >
                    {isInstalled
                      ? i18n.translate(
                          'xpack.infra.inventoryUI.otelKubernetesPodsDashboard.viewDashboardLink',
                          {
                            defaultMessage: 'View Dashboard',
                          }
                        )
                      : i18n.translate(
                          'xpack.infra.inventoryUI.otelKubernetesPodsDashboard.installDashboardLink',
                          {
                            defaultMessage: 'View Integration',
                          }
                        )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty
                    data-test-subj="infraOtelKubernetesDashboardCardHideThisButton"
                    color="text"
                    size="s"
                    onClick={handleClose}
                    aria-label={i18n.translate(
                      'xpack.infra.inventoryUI.otelKubernetesPodsDashboard.dismissCard',
                      {
                        defaultMessage: 'Dismiss card',
                      }
                    )}
                  >
                    {i18n.translate(
                      'xpack.infra.inventoryUI.otelKubernetesPodsDashboard.hideCard',
                      {
                        defaultMessage: 'Hide this',
                      }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
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
