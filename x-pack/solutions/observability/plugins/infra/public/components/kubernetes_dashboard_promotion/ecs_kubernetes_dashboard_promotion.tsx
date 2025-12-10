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

export const KubernetesDashboardCard = ({ onClose }: { onClose: () => void }) => {
  const { isInstalled } = useInstalledIntegration('kubernetes');

  return (
    <EuiPanel hasBorder={true} paddingSize="m" color="subdued" grow={false} borderRadius="m">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiImage
            src="https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=900&h=900&fit=crop&q=60"
            alt="Kubernetes Dashboards"
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
                        'xpack.infra.inventoryUI.kubernetesPodsDashboard.integrationInstalledTitle',
                        {
                          defaultMessage: 'View Kubernetes Dashboards',
                        }
                      )
                    : i18n.translate(
                        'xpack.infra.inventoryUI.kubernetesPodsDashboard.integrationNotInstalledTitle',
                        {
                          defaultMessage: 'Install Kubernetes Integration',
                        }
                      )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {isInstalled
                  ? i18n.translate(
                      'xpack.infra.inventoryUI.kubernetesPodsDashboard.integrationInstalledDescription',
                      { defaultMessage: 'View your Kubernetes Dashboards' }
                    )
                  : i18n.translate(
                      'xpack.infra.inventoryUI.kubernetesPodsDashboard.integrationNotInstalledDescription',
                      {
                        defaultMessage:
                          'Install the Kubernetes integration to view your Kubernetes Dashboards.',
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
                        ? 'infraKubernetesDashboardCardLink'
                        : 'infraKubernetesDashboardCardInstallLink'
                    }
                    href={
                      isInstalled
                        ? 'https://www.elastic.co/guide/en/observability/current/kubernetes-dashboards.html'
                        : 'https://www.elastic.co/guide/en/observability/current/kubernetes-dashboards.html'
                    }
                    target="_blank"
                    rel="noopener"
                  >
                    {isInstalled
                      ? i18n.translate(
                          'xpack.infra.inventoryUI.kubernetesPodsDashboard.viewDashboardLink',
                          {
                            defaultMessage: 'View Dashboard',
                          }
                        )
                      : i18n.translate(
                          'xpack.infra.inventoryUI.kubernetesPodsDashboard.installDashboardLink',
                          {
                            defaultMessage: 'View Integration',
                          }
                        )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty
                    data-test-subj="infraKubernetesDashboardCardHideThisButton"
                    color="text"
                    size="s"
                    onClick={onClose}
                    aria-label={i18n.translate(
                      'xpack.infra.inventoryUI.kubernetesPodsDashboard.dismissCard',
                      {
                        defaultMessage: 'Dismiss card',
                      }
                    )}
                  >
                    {i18n.translate('xpack.infra.inventoryUI.kubernetesPodsDashboard.hideCard', {
                      defaultMessage: 'Hide this',
                    })}
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

const LOCAL_STORAGE_KEY = 'inventoryUI:k8sDashboardClicked';
export const KubernetesButton = () => {
  const [clicked, setClicked] = useLocalStorage<boolean>(LOCAL_STORAGE_KEY, false);
  const clickedRef = useRef<boolean | undefined>(clicked);
  return (
    <TryItButton
      color={clickedRef.current ? 'primary' : 'accent'}
      label={i18n.translate('xpack.infra.bottomDrawer.kubernetesDashboardsLink', {
        defaultMessage: 'Kubernetes dashboards',
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
