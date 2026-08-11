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
import {
  INTEGRATION_DOCS_LINK,
  KUBERNETES_SEMCONV_INTEGRATION_ID,
  KUBERNETES_INTEGRATION_ID,
  INTEGRATION_PAGE_PATH,
  KUBERNETES_INTEGRATION_TAG,
  KUBERNETES_SEMCONV_INTEGRATION_TAG,
} from './constants';

type IntegrationType = 'ecs' | 'semconv';

interface IntegrationConfig {
  integrationId: typeof KUBERNETES_INTEGRATION_ID | typeof KUBERNETES_SEMCONV_INTEGRATION_ID;
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
      testSubj: string;
    };
  };
  link: {
    dashboardsPath: string;
    label: string;
    testSubj: string;
  };
}

const VIEW_DASHBOARDS_TEXT = i18n.translate(
  'xpack.infra.kubernetesDashboardPromotion.viewDashboardsLink',
  {
    defaultMessage: 'View Dashboards',
  }
);

const VIEW_INTEGRATION_TEXT = i18n.translate(
  'xpack.infra.kubernetesDashboardPromotion.viewIntegrationLink',
  {
    defaultMessage: 'View Integration',
  }
);

const DISMISS_TEXT = i18n.translate('xpack.infra.kubernetesDashboardPromotion.dismiss', {
  defaultMessage: 'Dismiss',
});

const ECS_CONFIG: IntegrationConfig = {
  integrationId: KUBERNETES_INTEGRATION_ID,
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
        dashboardsPath: `#/list?_g=()&s=tag:(${KUBERNETES_INTEGRATION_TAG})`,
        label: VIEW_DASHBOARDS_TEXT,
        testSubj: 'infraKubernetesDashboardCardLink',
      },
      notInstalled: {
        integrationPath: `${INTEGRATION_PAGE_PATH}/${KUBERNETES_INTEGRATION_ID}`,
        label: VIEW_INTEGRATION_TEXT,
        testSubj: 'infraKubernetesDashboardCardInstallLink',
      },
    },
    hideButton: {
      label: DISMISS_TEXT,
      testSubj: 'infraKubernetesDashboardCardHideThisButton',
    },
  },
  link: {
    dashboardsPath: `#/list?_g=()&s=tag:(${KUBERNETES_INTEGRATION_TAG})`,
    label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.ecs.bottomDrawerLink', {
      defaultMessage: 'Kubernetes Integration',
    }),
    testSubj: 'inventory-kubernetesDashboard-link',
  },
};

const SEMCONV_CONFIG: IntegrationConfig = {
  integrationId: KUBERNETES_SEMCONV_INTEGRATION_ID,
  card: {
    imageType: 'semconv',
    title: {
      installed: i18n.translate(
        'xpack.infra.kubernetesDashboardPromotion.semconv.integrationInstalledTitle',
        { defaultMessage: 'View Kubernetes OpenTelemetry Dashboards' }
      ),
      notInstalled: i18n.translate(
        'xpack.infra.kubernetesDashboardPromotion.semconv.integrationNotInstalledTitle',
        { defaultMessage: 'Install Kubernetes OpenTelemetry Dashboards' }
      ),
    },
    description: {
      installed: (integrationLink: React.ReactNode) => (
        <FormattedMessage
          id="xpack.infra.kubernetesDashboardPromotion.semconv.integrationInstalledDescription"
          defaultMessage="View dashboards available for the Kubernetes clusters which are observed using {integrationLink} which match your query."
          values={{ integrationLink }}
        />
      ),
      notInstalled: (integrationLink: React.ReactNode) => (
        <FormattedMessage
          id="xpack.infra.kubernetesDashboardPromotion.semconv.integrationNotInstalledDescription"
          defaultMessage="We have dashboards for Kubernetes clusters which are observed using {integrationLink} which match your query."
          values={{ integrationLink }}
        />
      ),
      docsLink: {
        text: i18n.translate(
          'xpack.infra.kubernetesDashboardPromotion.semconv.integrationDocsLinkText',
          { defaultMessage: 'OpenTelemetry' }
        ),
        testSubj: 'infraSemconvKubernetesDashboardCardIntegrationDocsLink',
      },
    },
    actionButton: {
      installed: {
        dashboardsPath: `#/list?_g=()&s=tag:(${KUBERNETES_SEMCONV_INTEGRATION_TAG})`,
        label: VIEW_DASHBOARDS_TEXT,
        testSubj: 'infraSemconvKubernetesDashboardCardLink',
      },
      notInstalled: {
        integrationPath: `${INTEGRATION_PAGE_PATH}/${KUBERNETES_SEMCONV_INTEGRATION_ID}`,
        label: VIEW_INTEGRATION_TEXT,
        testSubj: 'infraSemconvKubernetesDashboardCardInstallLink',
      },
    },
    hideButton: {
      label: DISMISS_TEXT,
      testSubj: 'infraSemconvKubernetesDashboardCardHideThisButton',
    },
  },
  link: {
    dashboardsPath: `#/list?_g=()&s=tag:(${KUBERNETES_SEMCONV_INTEGRATION_TAG})`,
    label: i18n.translate('xpack.infra.kubernetesDashboardPromotion.semconv.bottomDrawerLink', {
      defaultMessage: 'Kubernetes OpenTelemetry',
    }),
    testSubj: 'inventory-semconvKubernetesDashboard-link',
  },
};

const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  ecs: ECS_CONFIG,
  semconv: SEMCONV_CONFIG,
};

const IntegrationLink = ({
  integrationId,
  text,
  testSubj,
}: {
  integrationId: IntegrationConfig['integrationId'];
  text: string;
  testSubj: string;
}) => {
  return (
    <EuiLink
      data-test-subj={testSubj}
      href={`${INTEGRATION_DOCS_LINK}/${integrationId}`}
      target="_blank"
    >
      {text}
    </EuiLink>
  );
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
  const { card, integrationId } = INTEGRATION_CONFIGS[integrationType];
  const { services } = useKibanaContextForPlugin();
  const { getUrlForApp } = services.application;

  const actionButton = hasIntegrationInstalled
    ? card.actionButton.installed
    : card.actionButton.notInstalled;

  const actionUrl = hasIntegrationInstalled
    ? getUrlForApp('dashboards', { path: card.actionButton.installed.dashboardsPath })
    : getUrlForApp('integrations', { path: card.actionButton.notInstalled.integrationPath });

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
                  ? card.description.installed(
                      <IntegrationLink
                        integrationId={integrationId}
                        text={card.description.docsLink.text}
                        testSubj={card.description.docsLink.testSubj}
                      />
                    )
                  : card.description.notInstalled(
                      <IntegrationLink
                        integrationId={integrationId}
                        text={card.description.docsLink.text}
                        testSubj={card.description.docsLink.testSubj}
                      />
                    )}
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
                    aria-label={card.hideButton.label}
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
