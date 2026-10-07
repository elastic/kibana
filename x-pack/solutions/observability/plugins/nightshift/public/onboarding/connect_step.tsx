/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';
import {
  useElasticsearchConnectors,
  useStartOnboardingSuggestions,
  type ElasticsearchConnector,
} from './use_onboarding';

const ELASTICSEARCH_CONNECTOR_TYPE_ID = '.elasticsearch';

/** Step 1: connect an Elastic deployment through the External Elasticsearch connector. */
export function OnboardingConnectStep({
  onCancel,
}: {
  /** Shown while changing the deployment of an existing onboarding. */
  onCancel?: () => void;
} = {}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { triggersActionsUi } = useKibana().services;
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const { data: connectors = [], refetch: refetchConnectors } = useElasticsearchConnectors();
  const startSuggestions = useStartOnboardingSuggestions();
  const [pendingConnectorId, setPendingConnectorId] = useState<string | undefined>();

  const connect = useCallback(
    (connectorId: string) => {
      setPendingConnectorId(connectorId);
      startSuggestions.mutate([connectorId], {
        onSettled: () => setPendingConnectorId(undefined),
      });
    },
    [startSuggestions]
  );

  const flyout = useMemo(
    () =>
      isFlyoutOpen && triggersActionsUi
        ? triggersActionsUi.getAddConnectorFlyout({
            initialConnector: { actionTypeId: ELASTICSEARCH_CONNECTOR_TYPE_ID },
            onClose: () => setIsFlyoutOpen(false),
            onConnectorCreated: (connector) => {
              setIsFlyoutOpen(false);
              void refetchConnectors();
              connect(connector.id);
            },
          })
        : null,
    [connect, isFlyoutOpen, refetchConnectors, triggersActionsUi]
  );

  return (
    <div data-test-subj="nightshiftOnboardingConnectStep">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.connect.title', {
            defaultMessage: 'Connect your Elastic deployment',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.nightshift.onboarding.connect.description', {
            defaultMessage:
              'Nightshift reads logs, metrics, traces and alerts from your deployment with read-only credentials. Add the Kibana URL so it can also look at rules, SLOs and cases.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="none">
        <ConnectorRow
          title={i18n.translate('xpack.nightshift.onboarding.connect.newDeploymentTitle', {
            defaultMessage: 'Elastic deployment',
          })}
          description={i18n.translate(
            'xpack.nightshift.onboarding.connect.newDeploymentDescription',
            {
              defaultMessage:
                'Elastic Cloud, Serverless or self-managed · Elasticsearch and Kibana URL',
            }
          )}
          badge={i18n.translate('xpack.nightshift.onboarding.connect.recommendedBadge', {
            defaultMessage: 'Recommended',
          })}
          action={
            <EuiButton
              data-test-subj="nightshiftOnboardingConnectButton"
              fill
              size="s"
              onClick={() => setIsFlyoutOpen(true)}
              isDisabled={!triggersActionsUi || startSuggestions.isLoading}
            >
              {i18n.translate('xpack.nightshift.onboarding.connect.connectButton', {
                defaultMessage: 'Connect',
              })}
            </EuiButton>
          }
        />
        {connectors.map((connector) => (
          <div
            key={connector.id}
            css={css`
              border-top: ${euiTheme.border.thin};
            `}
          >
            <ExistingConnectorRow
              connector={connector}
              isLoading={pendingConnectorId === connector.id}
              isDisabled={startSuggestions.isLoading}
              onUse={() => connect(connector.id)}
            />
          </div>
        ))}
      </EuiPanel>
      {onCancel && (
        <>
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            size="s"
            iconType="arrowLeft"
            onClick={onCancel}
            data-test-subj="nightshiftOnboardingBackToSuggestionsButton"
          >
            {i18n.translate('xpack.nightshift.onboarding.connect.backButton', {
              defaultMessage: 'Back to suggestions',
            })}
          </EuiButtonEmpty>
        </>
      )}
      {flyout}
    </div>
  );
}

function ConnectorRow({
  title,
  description,
  badge,
  action,
}: {
  title: string;
  description: string;
  badge?: string;
  action: React.ReactNode;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      responsive={false}
      css={css`
        padding: ${euiTheme.size.m} ${euiTheme.size.base};
      `}
    >
      <EuiFlexItem grow={false}>
        <div
          css={css`
            align-items: center;
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
            display: flex;
            height: ${euiTheme.size.xxl};
            justify-content: center;
            width: ${euiTheme.size.xxl};
          `}
        >
          <EuiIcon type="logoElasticsearch" size="l" aria-hidden={true} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
          {badge && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{badge}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiText size="xs" color="subdued">
          {description}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{action}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ExistingConnectorRow({
  connector,
  isLoading,
  isDisabled,
  onUse,
}: {
  connector: ElasticsearchConnector;
  isLoading: boolean;
  isDisabled: boolean;
  onUse: () => void;
}): React.ReactElement {
  const description = [connector.url, connector.kibanaUrl].filter(Boolean).join(' · ');
  return (
    <ConnectorRow
      title={connector.name}
      description={
        description ||
        i18n.translate('xpack.nightshift.onboarding.connect.existingConnectorDescription', {
          defaultMessage: 'Existing connector',
        })
      }
      action={
        <EuiButtonEmpty
          data-test-subj="nightshiftOnboardingUseConnectorButton"
          size="s"
          iconType="link"
          isLoading={isLoading}
          isDisabled={isDisabled}
          onClick={onUse}
        >
          {i18n.translate('xpack.nightshift.onboarding.connect.useConnectorButton', {
            defaultMessage: 'Use this deployment',
          })}
        </EuiButtonEmpty>
      }
    />
  );
}
