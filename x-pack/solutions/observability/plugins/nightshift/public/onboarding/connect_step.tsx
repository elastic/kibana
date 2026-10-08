/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGrid,
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
  ONBOARDING_CONNECTOR_TYPES,
  useOnboardingConnectors,
  useStartOnboardingSuggestions,
  type OnboardingConnector,
} from './use_onboarding';

interface ConnectorTile {
  connectorTypeId: string;
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

const TILES: ConnectorTile[] = [
  {
    connectorTypeId: ONBOARDING_CONNECTOR_TYPES.elasticsearch,
    icon: 'logoElasticsearch',
    title: i18n.translate('xpack.nightshift.onboarding.connect.elasticsearchTitle', {
      defaultMessage: 'Elastic deployment',
    }),
    description: i18n.translate('xpack.nightshift.onboarding.connect.elasticsearchDescription', {
      defaultMessage:
        'Logs, metrics, traces and alerts. Add the Kibana URL for rules, SLOs and cases.',
    }),
    badge: i18n.translate('xpack.nightshift.onboarding.connect.requiredBadge', {
      defaultMessage: 'Required',
    }),
  },
  {
    connectorTypeId: ONBOARDING_CONNECTOR_TYPES.slack,
    icon: 'logoSlack',
    title: i18n.translate('xpack.nightshift.onboarding.connect.slackTitle', {
      defaultMessage: 'Slack',
    }),
    description: i18n.translate('xpack.nightshift.onboarding.connect.slackDescription', {
      defaultMessage: 'What your team is discussing: incidents, outages and alerts in channels.',
    }),
  },
  {
    connectorTypeId: ONBOARDING_CONNECTOR_TYPES.github,
    icon: 'logoGithub',
    title: i18n.translate('xpack.nightshift.onboarding.connect.githubTitle', {
      defaultMessage: 'GitHub',
    }),
    description: i18n.translate('xpack.nightshift.onboarding.connect.githubDescription', {
      defaultMessage: 'Recent changes: merged pull requests, releases and bug reports.',
    }),
  },
];

const ICON_BY_TYPE: Record<string, string> = Object.fromEntries(
  TILES.map(({ connectorTypeId, icon }) => [connectorTypeId, icon])
);

export const getConnectorIcon = (connectorTypeId: string): string =>
  ICON_BY_TYPE[connectorTypeId] ?? 'plugs';

/** Step 1: connect the tools Nightshift explores: Elastic deployments, Slack and GitHub. */
export function OnboardingConnectStep({
  initialSelectedIds,
  onCancel,
}: {
  /** Connectors of the current onboarding, when changing it. */
  initialSelectedIds?: string[];
  /** Shown while changing the connections of an existing onboarding. */
  onCancel?: () => void;
}): React.ReactElement {
  const { triggersActionsUi } = useKibana().services;
  const [flyoutType, setFlyoutType] = useState<string | undefined>();
  const { data: connectors, refetch: refetchConnectors } = useOnboardingConnectors();
  const startSuggestions = useStartOnboardingSuggestions();
  const [selectedIds, setSelectedIds] = useState<Set<string> | undefined>(
    initialSelectedIds ? new Set(initialSelectedIds) : undefined
  );

  // Without a previous onboarding every usable connector of the space starts selected.
  useEffect(() => {
    if (!selectedIds && connectors) {
      setSelectedIds(new Set(connectors.map(({ id }) => id)));
    }
  }, [connectors, selectedIds]);

  const selected = useMemo(
    () => (connectors ?? []).filter(({ id }) => selectedIds?.has(id)),
    [connectors, selectedIds]
  );
  const hasElasticDeployment = selected.some(
    ({ connectorTypeId }) => connectorTypeId === ONBOARDING_CONNECTOR_TYPES.elasticsearch
  );

  const toggle = useCallback((connectorId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(connectorId)) {
        next.delete(connectorId);
      } else {
        next.add(connectorId);
      }
      return next;
    });
  }, []);

  const flyout = useMemo(
    () =>
      flyoutType && triggersActionsUi
        ? triggersActionsUi.getAddConnectorFlyout({
            initialConnector: { actionTypeId: flyoutType },
            onClose: () => setFlyoutType(undefined),
            onConnectorCreated: (connector) => {
              setFlyoutType(undefined);
              setSelectedIds((previous) => new Set([...(previous ?? []), connector.id]));
              void refetchConnectors();
            },
          })
        : null,
    [flyoutType, refetchConnectors, triggersActionsUi]
  );

  const connectorsByType = (connectorTypeId: string) =>
    (connectors ?? []).filter((connector) => connector.connectorTypeId === connectorTypeId);

  return (
    <div data-test-subj="nightshiftOnboardingConnectStep">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.connect.title', {
            defaultMessage: 'Connect your tools',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.nightshift.onboarding.connect.description', {
            defaultMessage:
              'Nightshift looks at everything you connect with read-only access to find your first investigations. Connect at least one Elastic deployment; Slack and GitHub add context about discussions and recent changes.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={3} gutterSize="m">
        {TILES.map((tile) => {
          const count = connectorsByType(tile.connectorTypeId).length;
          return (
            <EuiFlexItem key={tile.connectorTypeId}>
              <EuiPanel
                hasBorder
                paddingSize="m"
                data-test-subj={`nightshiftOnboardingTile-${tile.connectorTypeId}`}
                css={css`
                  display: flex;
                  flex-direction: column;
                  height: 100%;
                `}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={tile.icon} size="l" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{tile.title}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {count > 0 ? (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="success" iconType="check">
                        {i18n.translate('xpack.nightshift.onboarding.connect.connectedBadge', {
                          defaultMessage: '{count} connected',
                          values: { count },
                        })}
                      </EuiBadge>
                    </EuiFlexItem>
                  ) : (
                    tile.badge && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{tile.badge}</EuiBadge>
                      </EuiFlexItem>
                    )
                  )}
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText
                  size="xs"
                  color="subdued"
                  css={css`
                    flex-grow: 1;
                  `}
                >
                  {tile.description}
                </EuiText>
                <EuiSpacer size="m" />
                <div>
                  <EuiButton
                    size="s"
                    iconType="plusInCircle"
                    fill={tile.connectorTypeId === ONBOARDING_CONNECTOR_TYPES.elasticsearch}
                    isDisabled={!triggersActionsUi}
                    onClick={() => setFlyoutType(tile.connectorTypeId)}
                    data-test-subj={`nightshiftOnboardingConnect-${tile.connectorTypeId}`}
                  >
                    {count > 0
                      ? i18n.translate('xpack.nightshift.onboarding.connect.addAnotherButton', {
                          defaultMessage: 'Add another',
                        })
                      : i18n.translate('xpack.nightshift.onboarding.connect.connectButton', {
                          defaultMessage: 'Connect',
                        })}
                  </EuiButton>
                </div>
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>

      {connectors && connectors.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.nightshift.onboarding.connect.connectedTitle', {
                defaultMessage: 'Connected ({selected} of {total} selected)',
                values: { selected: selected.length, total: connectors.length },
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="none">
            {connectors.map((connector, index) => (
              <ConnectedRow
                key={connector.id}
                connector={connector}
                isSelected={Boolean(selectedIds?.has(connector.id))}
                onToggle={() => toggle(connector.id)}
                hasDivider={index > 0}
              />
            ))}
          </EuiPanel>
        </>
      )}

      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          {onCancel && (
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
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            {!hasElasticDeployment && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.nightshift.onboarding.connect.elasticRequiredHint', {
                    defaultMessage: 'Select at least one Elastic deployment to continue.',
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="sparkles"
                iconSide="right"
                isDisabled={!hasElasticDeployment}
                isLoading={startSuggestions.isLoading}
                onClick={() => startSuggestions.mutate(selected.map(({ id }) => id))}
                data-test-subj="nightshiftOnboardingContinueButton"
              >
                {i18n.translate('xpack.nightshift.onboarding.connect.continueButton', {
                  defaultMessage: 'Find first investigations',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {flyout}
    </div>
  );
}

function ConnectedRow({
  connector,
  isSelected,
  onToggle,
  hasDivider,
}: {
  connector: OnboardingConnector;
  isSelected: boolean;
  onToggle: () => void;
  hasDivider: boolean;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const details = [connector.url, connector.kibanaUrl].filter(Boolean).join(' · ');
  const tile = TILES.find(({ connectorTypeId }) => connectorTypeId === connector.connectorTypeId);
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      responsive={false}
      data-test-subj="nightshiftOnboardingConnectedRow"
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.base};
        ${hasDivider ? `border-top: ${euiTheme.border.thin};` : ''}
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiCheckbox
          id={`nightshiftOnboardingConnector-${connector.id}`}
          checked={isSelected}
          onChange={onToggle}
          aria-label={connector.name}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type={getConnectorIcon(connector.connectorTypeId)} size="m" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong>{connector.name}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {details || tile?.title || connector.connectorTypeId}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
