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

type IntegrationType = 'ecs' | 'otel';

interface IntegrationConfig {
  card: {
    imageType: IntegrationType;
    title: {
      installed: string;
      notInstalled: string;
    };
    description: {
      installed: (integrationLink: React.ReactNode) => React.ReactNode;
      notInstalled: (integrationLink: React.ReactNode) => React.ReactNode;
      docsLink: {
        url: string;
        text: string;
        testSubj: string;
      };
    };
    actionButton: {
      installed: {
        dashboardsPath: string;
        label: string;
        testSubj: string;
      };
      notInstalled: {
        integrationPath: string;
        label: string;
        testSubj: string;
      };
    };
    hideButton: {
      label: string;
      ariaLabel: string;
      testSubj: string;
    };
  };
  link: {
    dashboardsPath: string;
    label: string;
    testSubj: string;
  };
}

const ECS_CONFIG: IntegrationConfig = {
  card: {
    imageType: 'ecs',
    title: {
      installed: i18n.translate(
        'xpack.infra.kubernetesDashboardPromotion.ecs.integrationInstalledTitle',
        { defaultMessage: 'View Kubernetes Dashboards' }
      ),
      notInstalled: i18n.translate(
        'xpack.infra.kubernetesDashboardPromotion.ecs.integrationNotInstalledTitle',
        { defaultMessage: 'Install Kubernetes Integration' }
      ),
    },
    description: {
      installed: (integrationLink: React.ReactNode) => (
        <FormattedMessage
          id="xpack.infra.kubernetesDashboardPromotion.ecs.integrationInstalledDescription"
          defaultMessage="View dashboards available for the Kubernetes clusters observed using the {integrationLink} which match your query."
          values={{ integrationLink }}
        />
      ),
      notInstalled: (integrationLink: React.ReactNode) => (
        <FormattedMessage
          id="xpack.infra.kubernetesDashboardPromotion.ecs.integrationNotInstalledDescription"
          defaultMessage="We have dashboards for Kubernetes clusters observed using the {integrationLink} which match your query."
          values={{ integrationLink }}
        />
      ),
      docsLink: {
        url: 'https://www.elastic.co/docs/reference/integrations/kubernetes',
        text: i18n.translate(
          'xpack.infra.kubernetesDashboardPromotion.ecs.integrationDocsLinkText',
          {
            defaultMessage: 'Kubernetes Integration',
          }
        ),
        testSubj: 'infraKubernetesDashboardCardIntegrationDocsLink',
      },
    },
    actionButton: {
      installed: {
        dashboardsPath: '#/list?_g=()&s=tag:(Kubernetes)',
        label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.ecs.viewDashboardsLink', {
          defaultMessage: 'View Dashboards',
        }),
        testSubj: 'infraKubernetesDashboardCardLink',
      },
      notInstalled: {
        integrationPath: '/detail/kubernetes',
        label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.ecs.viewIntegrationLink', {
          defaultMessage: 'View Integration',
        }),
        testSubj: 'infraKubernetesDashboardCardInstallLink',
      },
    },
    hideButton: {
      label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.ecs.hideCard', {
        defaultMessage: 'Hide this',
      }),
      ariaLabel: i18n.translate('xpack.infra.kubernetesDashboardPromotion.ecs.dismissCard', {
        defaultMessage: 'Dismiss card',
      }),
      testSubj: 'infraKubernetesDashboardCardHideThisButton',
    },
  },
  link: {
    dashboardsPath: '#/list?_g=()&s=tag:(Kubernetes)',
    label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.ecs.bottomDrawerLink', {
      defaultMessage: 'Kubernetes Integration',
    }),
    testSubj: 'inventory-kubernetesDashboard-link',
  },
};

const OTEL_CONFIG: IntegrationConfig = {
  card: {
    imageType: 'otel',
    title: {
      installed: i18n.translate(
        'xpack.infra.kubernetesDashboardPromotion.otel.integrationInstalledTitle',
        { defaultMessage: 'View Kubernetes OpenTelemetry Dashboards' }
      ),
      notInstalled: i18n.translate(
        'xpack.infra.kubernetesDashboardPromotion.otel.integrationNotInstalledTitle',
        { defaultMessage: 'Install Kubernetes OpenTelemetry Dashboards' }
      ),
    },
    description: {
      installed: (integrationLink: React.ReactNode) => (
        <FormattedMessage
          id="xpack.infra.kubernetesDashboardPromotion.otel.integrationInstalledDescription"
          defaultMessage="View dashboards available for the Kubernetes clusters which are observed using {integrationLink} which match your query."
          values={{ integrationLink }}
        />
      ),
      notInstalled: (integrationLink: React.ReactNode) => (
        <FormattedMessage
          id="xpack.infra.kubernetesDashboardPromotion.otel.integrationNotInstalledDescription"
          defaultMessage="We have dashboards for Kubernetes clusters which are observed using {integrationLink} which match your query."
          values={{ integrationLink }}
        />
      ),
      docsLink: {
        url: 'https://www.elastic.co/docs/reference/integrations/kubernetes_otel',
        text: i18n.translate(
          'xpack.infra.kubernetesDashboardPromotion.otel.integrationDocsLinkText',
          { defaultMessage: 'OpenTelemetry' }
        ),
        testSubj: 'infraOtelKubernetesDashboardCardIntegrationDocsLink',
      },
    },
    actionButton: {
      installed: {
        dashboardsPath: '#/list?_g=()&s=tag:("Kubernetes OpenTelemetry Assets")',
        label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.otel.viewDashboardsLink', {
          defaultMessage: 'View Dashboards',
        }),
        testSubj: 'infraOtelKubernetesDashboardCardLink',
      },
      notInstalled: {
        integrationPath: '/detail/kubernetes_otel',
        label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.otel.viewIntegrationLink', {
          defaultMessage: 'View Integration',
        }),
        testSubj: 'infraOtelKubernetesDashboardCardInstallLink',
      },
    },
    hideButton: {
      label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.otel.hideCard', {
        defaultMessage: 'Hide this',
      }),
      ariaLabel: i18n.translate('xpack.infra.kubernetesDashboardPromotion.otel.dismissCard', {
        defaultMessage: 'Dismiss card',
      }),
      testSubj: 'infraOtelKubernetesDashboardCardHideThisButton',
    },
  },
  link: {
    dashboardsPath: '#/list?_g=()&s=tag:("Kubernetes OpenTelemetry Assets")',
    label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.otel.bottomDrawerLink', {
      defaultMessage: 'Kubernetes OpenTelemetry',
    }),
    testSubj: 'inventory-otelKubernetesDashboard-link',
  },
};

const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  ecs: ECS_CONFIG,
  otel: OTEL_CONFIG,
};

export const KubernetesDashboardCard = ({
  integrationType,
  onClose,
  hasIntegrationInstalled,
}: {
  integrationType: IntegrationType;
  onClose: () => void;
  hasIntegrationInstalled: boolean;
}) => {
  const { card } = INTEGRATION_CONFIGS[integrationType];
  const { services } = useKibanaContextForPlugin();
  const { getUrlForApp } = services.application;

  const actionButton = hasIntegrationInstalled
    ? card.actionButton.installed
    : card.actionButton.notInstalled;

  const actionUrl = hasIntegrationInstalled
    ? getUrlForApp('dashboards', { path: card.actionButton.installed.dashboardsPath })
    : getUrlForApp('integrations', { path: card.actionButton.notInstalled.integrationPath });

  const integrationLink = (
    <EuiLink
      data-test-subj={card.description.docsLink.testSubj}
      href={card.description.docsLink.url}
      target="_blank"
    >
      {card.description.docsLink.text}
    </EuiLink>
  );

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
          <KubernetesAssetImage type={card.imageType} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h4>{hasIntegrationInstalled ? card.title.installed : card.title.notInstalled}</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {hasIntegrationInstalled
                  ? card.description.installed(integrationLink)
                  : card.description.notInstalled(integrationLink)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="xs" responsive={false} alignItems="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="s" data-test-subj={actionButton.testSubj} href={actionUrl}>
                    {actionButton.label}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty
                    data-test-subj={card.hideButton.testSubj}
                    color="text"
                    size="s"
                    onClick={onClose}
                    aria-label={card.hideButton.ariaLabel}
                  >
                    {card.hideButton.label}
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

export const KubernetesDashboardLink = ({
  integrationType,
}: {
  integrationType: IntegrationType;
}) => {
  const { link } = INTEGRATION_CONFIGS[integrationType];
  const { services } = useKibanaContextForPlugin();
  const { getUrlForApp } = services.application;

  const dashboardUrl = getUrlForApp('dashboards', { path: link.dashboardsPath });

  return (
    <EuiLink aria-label={link.label} data-test-subj={link.testSubj} href={dashboardUrl}>
      {link.label}
    </EuiLink>
  );
};
