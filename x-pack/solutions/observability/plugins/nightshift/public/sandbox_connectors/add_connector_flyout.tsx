/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { checkActionTypeEnabled } from '@kbn/alerts-ui-shared/src/check_action_type_enabled';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { useConnectorsByType, type ConnectorTypeGroup } from './use_connectors_by_type';
import { noAgentPermissionReason, useAgentConnectors } from './use_agent_connectors';
import { useAddConnectorFlyout } from './use_add_connector_flyout';
import { getSourceCardItem } from './source_card_item';
import { SandboxConnectorsError } from './sandbox_connectors_error';

const noPermissionReason = i18n.translate('xpack.nightshift.addConnectorFlyout.noPermission', {
  defaultMessage: 'You need permission to create connectors and to edit the investigation agent.',
});

const createLabel = i18n.translate('xpack.nightshift.addConnectorFlyout.createButton', {
  defaultMessage: 'Create connector',
});

export function AddConnectorFlyout({ onClose }: { onClose: () => void }): React.ReactElement {
  const { application, triggersActionsUi } = useKibana().services;
  const { groups, isLoading, error, typesError, refetch } = useConnectorsByType();
  const { assignedIds, assign, unassign, canEditAgent, updatingId } = useAgentConnectors();
  const { openAdd, addFlyout } = useAddConnectorFlyout();
  const [search, setSearch] = useState('');
  const titleId = useGeneratedHtmlId({ prefix: 'nightshiftAddConnectorFlyout' });

  const canCreate = application.capabilities.actions?.save === true && canEditAgent;
  const query = search.trim().toLowerCase();

  const shown = useMemo(
    () =>
      groups.map((group) => {
        if (!query) return group;
        const item = triggersActionsUi
          ? getSourceCardItem({
              actionType: group.actionType,
              actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
            })
          : undefined;
        const typeMatches = (item?.name ?? group.actionType.name).toLowerCase().includes(query);
        return {
          ...group,
          connectors: typeMatches
            ? group.connectors
            : group.connectors.filter(({ name }) => name.toLowerCase().includes(query)),
        };
      }),
    [groups, query, triggersActionsUi]
  );

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        size="m"
        aria-labelledby={titleId}
        data-test-subj="nightshiftAddConnectorFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>
              {i18n.translate('xpack.nightshift.addConnectorFlyout.title', {
                defaultMessage: 'Add connector',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFieldSearch
            fullWidth
            placeholder={i18n.translate('xpack.nightshift.addConnectorFlyout.searchPlaceholder', {
              defaultMessage: 'Search',
            })}
            aria-label={i18n.translate('xpack.nightshift.addConnectorFlyout.searchLabel', {
              defaultMessage: 'Search connectors',
            })}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-test-subj="nightshiftAddConnectorFlyoutSearch"
          />
          <EuiSpacer size="m" />
          {isLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : error ? (
            <SandboxConnectorsError
              title={
                typesError
                  ? i18n.translate('xpack.nightshift.addConnectorFlyout.loadError', {
                      defaultMessage: 'Could not load the connector types.',
                    })
                  : undefined
              }
              onRetry={refetch}
              data-test-subj="nightshiftAddConnectorFlyoutError"
            />
          ) : triggersActionsUi ? (
            <EuiFlexGroup direction="column" gutterSize="s">
              {shown.map((group) => {
                const enabledCheck = checkActionTypeEnabled(group.actionType);
                return (
                  <EuiFlexItem key={group.actionType.id} grow={false}>
                    <ConnectorTypeRow
                      group={group}
                      item={getSourceCardItem({
                        actionType: group.actionType,
                        actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
                      })}
                      createDisabledReason={
                        !canCreate
                          ? noPermissionReason
                          : enabledCheck.isEnabled
                          ? undefined
                          : enabledCheck.message
                      }
                      onCreate={() => openAdd(group.actionType.id)}
                      assignedIds={assignedIds}
                      isSearching={query.length > 0}
                      canToggle={canEditAgent}
                      updatingId={updatingId}
                      onToggle={(connector, enable) =>
                        enable ? assign(connector) : unassign(connector)
                      }
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          ) : null}
        </EuiFlyoutBody>
      </EuiFlyout>
      {addFlyout}
    </>
  );
}

function ConnectorTypeRow({
  group: { actionType, connectors },
  item,
  createDisabledReason,
  onCreate,
  assignedIds,
  canToggle,
  updatingId,
  onToggle,
  isSearching,
}: {
  group: ConnectorTypeGroup;
  item: ReturnType<typeof getSourceCardItem>;
  createDisabledReason?: string;
  onCreate: () => void;
  assignedIds: string[];
  canToggle: boolean;
  updatingId: string | undefined;
  onToggle: (connector: SandboxConnector, enable: boolean) => void;
  isSearching: boolean;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const plateShadow = useEuiShadow('xs');
  const accordionId = useGeneratedHtmlId({ prefix: 'nightshiftConnectorType' });
  const hasConnectors = connectors.length > 0;

  const createButton = (
    <EuiButton
      size="s"
      color="text"
      iconType="plus"
      isDisabled={createDisabledReason !== undefined}
      onClick={onCreate}
      aria-label={`${createLabel}: ${item.name}`}
      data-test-subj={`${actionType.id}-create`}
    >
      {createLabel}
    </EuiButton>
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj={`${actionType.id}-row`}>
      <EuiAccordion
        id={accordionId}
        arrowDisplay="left"
        isDisabled={!hasConnectors}
        forceState={isSearching && hasConnectors ? 'open' : undefined}
        buttonContent={
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <div
                aria-hidden={true}
                css={css`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 40px;
                  height: 40px;
                  border-radius: ${euiTheme.size.s};
                  background: ${euiTheme.colors.backgroundBasePlain};
                  ${plateShadow}
                `}
              >
                <EuiIcon type={item.iconClass} size="m" aria-hidden={true} />
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{item.name}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued" data-test-subj={`${actionType.id}-count`}>
                {i18n.translate('xpack.nightshift.addConnectorFlyout.connectorCount', {
                  defaultMessage: '{count, plural, one {# connector} other {# connectors}}',
                  values: { count: connectors.length },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        buttonProps={{ 'data-test-subj': `${actionType.id}-toggle` }}
        extraAction={
          createDisabledReason === undefined ? (
            createButton
          ) : (
            <EuiToolTip position="top" content={createDisabledReason}>
              {createButton}
            </EuiToolTip>
          )
        }
      >
        {hasConnectors && (
          <>
            <EuiSpacer size="s" />
            <ul
              css={css`
                list-style: none;
                margin: 0;
                padding: 0;
              `}
              data-test-subj={`${actionType.id}-connectors`}
            >
              {connectors.map((connector) => {
                const isEnabled = assignedIds.includes(connector.id);
                const isUpdating = updatingId === connector.id;
                const toggle = isEnabled ? (
                  <EuiButtonEmpty
                    size="s"
                    color="success"
                    iconType="check"
                    isLoading={isUpdating}
                    isDisabled={!canToggle}
                    onClick={() => onToggle(connector, false)}
                    aria-label={i18n.translate(
                      'xpack.nightshift.addConnectorFlyout.disableAction',
                      { defaultMessage: 'Disable {name}', values: { name: connector.name } }
                    )}
                    data-test-subj={`nightshiftConnectorEnabled-${connector.id}`}
                  >
                    {i18n.translate('xpack.nightshift.addConnectorFlyout.enabledLabel', {
                      defaultMessage: 'Enabled',
                    })}
                  </EuiButtonEmpty>
                ) : (
                  <EuiButtonEmpty
                    size="s"
                    isLoading={isUpdating}
                    isDisabled={!canToggle}
                    onClick={() => onToggle(connector, true)}
                    aria-label={i18n.translate('xpack.nightshift.addConnectorFlyout.enableAction', {
                      defaultMessage: 'Enable {name}',
                      values: { name: connector.name },
                    })}
                    data-test-subj={`nightshiftConnectorEnable-${connector.id}`}
                  >
                    {i18n.translate('xpack.nightshift.addConnectorFlyout.enableLabel', {
                      defaultMessage: 'Enable',
                    })}
                  </EuiButtonEmpty>
                );
                return (
                  <li
                    key={connector.id}
                    css={css`
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      gap: ${euiTheme.size.s};
                      padding: ${euiTheme.size.xs} 0 ${euiTheme.size.xs} ${euiTheme.size.l};
                      border-top: ${euiTheme.border.thin};
                    `}
                    data-test-subj={`nightshiftConnectorRow-${connector.id}`}
                  >
                    <EuiText size="s">{connector.name}</EuiText>
                    {canToggle ? (
                      toggle
                    ) : (
                      <EuiToolTip position="top" content={noAgentPermissionReason}>
                        {toggle}
                      </EuiToolTip>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
}
