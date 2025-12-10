/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { KubernetesAssetImage } from './kubernetes_asset_image';

const ECS_DOCS_URL = 'https://www.elastic.co/docs/reference/integrations/kubernetes';
const ECS_K8S_DASHBOARDS_PATH = '#/list?_g=()&s=tag:(Kubernetes)';

const EcsKubernetesIntegrationLink = () => (
  <EuiLink
    data-test-subj="infraEcsKubernetesDashboardCardIntegrationDocsLink"
    href={ECS_DOCS_URL}
    target="_blank"
  >
    {i18n.translate('xpack.infra.inventoryUI.ecsKubernetesDashboardCard.integrationDocsLinkText', {
      defaultMessage: 'Kubernetes Integration',
    })}
  </EuiLink>
);
export const KubernetesDashboardCard = ({
  onClose,
  hasIntegrationInstalled,
}: {
  onClose: () => void;
  hasIntegrationInstalled: boolean;
}) => {
  const { services } = useKibanaContextForPlugin();
  const { getUrlForApp } = services.application;

  const ecsKubernetesIntegrationUrl = getUrlForApp('integrations', {
    path: '/detail/kubernetes',
  });

  const ecsKubernetesDashboardUrl = getUrlForApp('dashboards', {
    path: ECS_K8S_DASHBOARDS_PATH,
  });

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      color="subdued"
      grow
      borderRadius="m"
      css={{ display: 'flex' }}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <KubernetesAssetImage type="ecs" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h4>
                  {hasIntegrationInstalled
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
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {hasIntegrationInstalled ? (
                  <FormattedMessage
                    id="xpack.infra.inventoryUI.kubernetesPodsDashboard.integrationInstalledDescription"
                    defaultMessage="View dashboards available for the Kubernetes clusters observed using the {kubernetesIntegration} which match your query."
                    values={{ kubernetesIntegration: <EcsKubernetesIntegrationLink /> }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.infra.inventoryUI.kubernetesPodsDashboard.integrationNotInstalledDescription"
                    defaultMessage="We have dashboards for Kubernetes clusters observed using the {kubernetesIntegration} which match your query."
                    values={{ kubernetesIntegration: <EcsKubernetesIntegrationLink /> }}
                  />
                )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="xs" responsive={false} alignItems="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    data-test-subj={
                      hasIntegrationInstalled
                        ? 'infraKubernetesDashboardCardLink'
                        : 'infraKubernetesDashboardCardInstallLink'
                    }
                    href={
                      hasIntegrationInstalled
                        ? ecsKubernetesDashboardUrl
                        : ecsKubernetesIntegrationUrl
                    }
                  >
                    {hasIntegrationInstalled
                      ? i18n.translate(
                          'xpack.infra.inventoryUI.kubernetesPodsDashboard.viewDashboardsLink',
                          {
                            defaultMessage: 'View Dashboards',
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

export const KubernetesButton = () => {
  const { services } = useKibanaContextForPlugin();
  const { getUrlForApp } = services.application;
  const kubernetesDashboardUrl = getUrlForApp('dashboards', {
    path: ECS_K8S_DASHBOARDS_PATH,
  });

  return (
    <EuiLink
      aria-label={i18n.translate('xpack.infra.bottomDrawer.kubernetesDashboardsLink', {
        defaultMessage: 'Kubernetes Integration',
      })}
      data-test-subj="inventory-kubernetesDashboard-link"
      href={kubernetesDashboardUrl}
    >
      {i18n.translate('xpack.infra.bottomDrawer.kubernetesDashboardsLink', {
        defaultMessage: 'Kubernetes Integration',
      })}
    </EuiLink>
  );
};
