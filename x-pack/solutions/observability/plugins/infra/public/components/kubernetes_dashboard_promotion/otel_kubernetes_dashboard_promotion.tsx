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
  EuiTitle,
  EuiText,
  EuiButtonEmpty,
  EuiLink,
} from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { KubernetesAssetImage } from './kubernetes_asset_image';

const OTEL_DOCS_URL = 'https://www.elastic.co/docs/reference/integrations/kubernetes_otel';
const OTEL_K8S_DASHBOARDS_PATH = '#/list?_g=()&s=tag:("Kubernetes OpenTelemetry Assets")';

const OpenTelemetryLink = () => (
  <EuiLink
    data-test-subj="infraOtelKubernetesDashboardCardOpenTelemetryLink"
    href={OTEL_DOCS_URL}
    target="_blank"
  >
    {i18n.translate('xpack.infra.inventoryUI.otelKubernetesPodsDashboard.openTelemetryLinkText', {
      defaultMessage: 'OpenTelemetry',
    })}
  </EuiLink>
);

export const OtelKubernetesDashboardCard = ({
  onClose,
  hasIntegrationInstalled,
}: {
  onClose: () => void;
  hasIntegrationInstalled: boolean;
}) => {
  const { services } = useKibanaContextForPlugin();
  const { getUrlForApp } = services.application;

  const otelKubernetesIntegrationUrl = getUrlForApp('integrations', {
    path: '/detail/kubernetes_otel',
  });

  const otelKubernetesDashboardUrl = getUrlForApp('dashboards', {
    path: OTEL_K8S_DASHBOARDS_PATH,
  });

  const handleClose = () => {
    onClose();
  };

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
          <KubernetesAssetImage type="otel" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h4>
                  {hasIntegrationInstalled
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
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {hasIntegrationInstalled ? (
                  <FormattedMessage
                    id="xpack.infra.inventoryUI.otelKubernetesPodsDashboard.integrationInstalledDescription"
                    defaultMessage="View dashboards available for the Kubernetes clusters which are observed using {openTelemetryLink} which match your query."
                    values={{
                      openTelemetryLink: <OpenTelemetryLink />,
                    }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.infra.inventoryUI.otelKubernetesPodsDashboard.integrationNotInstalledDescription"
                    defaultMessage="We have dashboards for Kubernetes clusters which are observed using {openTelemetryLink} which match your query."
                    values={{
                      openTelemetryLink: <OpenTelemetryLink />,
                    }}
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
                        ? 'infraOtelKubernetesDashboardCardLink'
                        : 'infraOtelKubernetesDashboardCardInstallLink'
                    }
                    href={
                      hasIntegrationInstalled
                        ? otelKubernetesDashboardUrl
                        : otelKubernetesIntegrationUrl
                    }
                  >
                    {hasIntegrationInstalled
                      ? i18n.translate(
                          'xpack.infra.inventoryUI.otelKubernetesPodsDashboard.viewDashboardsLink',
                          {
                            defaultMessage: 'View Dashboards',
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

export const OtelKubernetesButton = () => {
  const { services } = useKibanaContextForPlugin();
  const { getUrlForApp } = services.application;
  const otelKubernetesDashboardUrl = getUrlForApp('dashboards', {
    path: OTEL_K8S_DASHBOARDS_PATH,
  });

  return (
    <EuiLink
      aria-label={i18n.translate('xpack.infra.bottomDrawer.otelKubernetesDashboardsLink', {
        defaultMessage: 'Kubernetes OpenTelemetry',
      })}
      data-test-subj="inventory-otelKubernetesDashboard-link"
      href={otelKubernetesDashboardUrl}
    >
      {i18n.translate('xpack.infra.bottomDrawer.otelKubernetesDashboardsLink', {
        defaultMessage: 'Kubernetes OpenTelemetry',
      })}
    </EuiLink>
  );
};
