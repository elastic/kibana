/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
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
import { CustomContextSnippets } from '../custom_context/custom_context_flyout';
import { useFetchCustomContext } from '../custom_context/use_fetch_custom_context';
import { ONBOARDING_CONNECTOR_TYPES, type OnboardingConnector } from './use_onboarding';

interface ConnectorTile {
  connectorTypeId: string;
  icon: string;
  title: string;
  category: string;
  badge?: string;
}

const TILES: ConnectorTile[] = [
  {
    connectorTypeId: ONBOARDING_CONNECTOR_TYPES.elasticsearch,
    icon: 'logoElasticsearch',
    title: i18n.translate('xpack.nightshift.onboarding.connect.elasticsearchTitle', {
      defaultMessage: 'Elastic deployment',
    }),
    category: i18n.translate('xpack.nightshift.onboarding.connect.elasticsearchCategory', {
      defaultMessage: 'Connector · Logs, metrics, traces and alerts',
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
    category: i18n.translate('xpack.nightshift.onboarding.connect.slackCategory', {
      defaultMessage: 'Connector · Messaging',
    }),
  },
  {
    connectorTypeId: ONBOARDING_CONNECTOR_TYPES.github,
    icon: 'logoGithub',
    title: i18n.translate('xpack.nightshift.onboarding.connect.githubTitle', {
      defaultMessage: 'GitHub',
    }),
    category: i18n.translate('xpack.nightshift.onboarding.connect.githubCategory', {
      defaultMessage: 'Connector · Code changes',
    }),
  },
];

const ICON_BY_TYPE: Record<string, string> = Object.fromEntries(
  TILES.map(({ connectorTypeId, icon }) => [connectorTypeId, icon])
);

export const getConnectorIcon = (connectorTypeId: string): string =>
  ICON_BY_TYPE[connectorTypeId] ?? 'plugs';

/** Step 1: connect Elastic deployments, Slack and GitHub, and optionally describe the system. */
export function OnboardingConnectStep({
  connectors,
  selectedIds,
  onToggle,
  onConnectorCreated,
}: {
  connectors: OnboardingConnector[] | undefined;
  selectedIds: ReadonlySet<string>;
  onToggle: (connectorId: string) => void;
  onConnectorCreated: (connectorId: string) => void;
}): React.ReactElement {
  const { triggersActionsUi } = useKibana().services;
  const [flyoutType, setFlyoutType] = useState<string | undefined>();

  const flyout = useMemo(
    () =>
      flyoutType && triggersActionsUi
        ? triggersActionsUi.getAddConnectorFlyout({
            initialConnector: { actionTypeId: flyoutType },
            onClose: () => setFlyoutType(undefined),
            onConnectorCreated: (connector) => {
              setFlyoutType(undefined);
              onConnectorCreated(connector.id);
            },
          })
        : null,
    [flyoutType, onConnectorCreated, triggersActionsUi]
  );

  const countByType = (connectorTypeId: string) =>
    (connectors ?? []).filter((connector) => connector.connectorTypeId === connectorTypeId).length;

  return (
    <div data-test-subj="nightshiftOnboardingConnectStep">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.connect.title', {
            defaultMessage: 'Add signals and alerts',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.nightshift.onboarding.connect.description', {
            defaultMessage:
              'Nightshift explores everything you connect, read-only, to find your first investigations. Connect at least one Elastic deployment; Slack and GitHub add what your team discusses and what changed.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={2} gutterSize="m">
        {TILES.map((tile) => (
          <EuiFlexItem key={tile.connectorTypeId}>
            <ConnectorTileCard
              tile={tile}
              count={countByType(tile.connectorTypeId)}
              isDisabled={!triggersActionsUi}
              onConnect={() => setFlyoutType(tile.connectorTypeId)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>

      {connectors && connectors.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.nightshift.onboarding.connect.connectedTitle', {
                defaultMessage: 'Connected ({selected} of {total} selected)',
                values: {
                  selected: connectors.filter(({ id }) => selectedIds.has(id)).length,
                  total: connectors.length,
                },
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="none">
            {connectors.map((connector, index) => (
              <ConnectedRow
                key={connector.id}
                connector={connector}
                isSelected={selectedIds.has(connector.id)}
                onToggle={() => onToggle(connector.id)}
                hasDivider={index > 0}
              />
            ))}
          </EuiPanel>
        </>
      )}

      <OnboardingHintsSection />
      {flyout}
    </div>
  );
}

function ConnectorTileCard({
  tile,
  count,
  isDisabled,
  onConnect,
}: {
  tile: ConnectorTile;
  count: number;
  isDisabled: boolean;
  onConnect: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={`nightshiftOnboardingTile-${tile.connectorTypeId}`}
      css={css`
        height: 100%;
      `}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
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
            <EuiIcon type={tile.icon} size="m" aria-hidden={true} />
          </div>
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
      <EuiSpacer size="m" />
      <EuiText size="s">
        <strong>{tile.title}</strong>
      </EuiText>
      <EuiText size="xs" color="subdued">
        {tile.category}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton
        size="s"
        color="text"
        isDisabled={isDisabled}
        onClick={onConnect}
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
    </EuiPanel>
  );
}

/**
 * Optional hints about the system. They are the space's custom context, so the exploration run
 * uses them and so does every investigation after it.
 */
function OnboardingHintsSection(): React.ReactElement | null {
  const { data, error } = useFetchCustomContext();
  // The custom context API is off (404) without the nightshift.enabled flag.
  if (error || !data) return null;
  return (
    <div data-test-subj="nightshiftOnboardingHints">
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.nightshift.onboarding.hints.title', {
                defaultMessage: 'Tell Nightshift about your system',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('xpack.nightshift.onboarding.hints.optionalBadge', {
              defaultMessage: 'Optional',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.nightshift.onboarding.hints.description', {
            defaultMessage:
              'Which services matter most, where your data lives, who owns what. Nightshift uses these hints to find your first investigations, and in every investigation after that.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <CustomContextSnippets
        snippets={data.snippets}
        version={data.version}
        canEdit
        showEmptyPrompt={false}
        addLabel={i18n.translate('xpack.nightshift.onboarding.hints.addButton', {
          defaultMessage: 'Add a hint',
        })}
        placeholder={i18n.translate('xpack.nightshift.onboarding.hints.placeholder', {
          defaultMessage:
            'For example: checkout-service is business critical. Production logs are in logs-prod-*. Team Osprey owns payments.',
        })}
      />
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
