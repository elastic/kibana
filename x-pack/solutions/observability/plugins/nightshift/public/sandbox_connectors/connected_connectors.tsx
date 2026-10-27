/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { useFetchSandboxConnectors } from './use_fetch_sandbox_connectors';
import { useAgentConnectors } from './use_agent_connectors';
import { useEditConnector } from './use_edit_connector';
import { SandboxConnectorsError } from './sandbox_connectors_error';
import { preconfiguredTooltip } from './sandbox_connectors';
import { SourceCard } from './source_card';
import { sourceGridThreeColumnsStyles } from './source_grid_styles';

const noPermissionTooltip = i18n.translate('xpack.nightshift.connectedConnectors.noPermission', {
  defaultMessage: 'You need permission to edit connectors.',
});

/** The sandbox-capable connectors assigned to the investigation agent in Agent Builder */
export function ConnectedConnectors({
  collapseSignal = 0,
}: {
  collapseSignal?: number;
}): React.ReactElement | null {
  const { data, error, isLoading, refetch } = useFetchSandboxConnectors();
  const agent = useAgentConnectors();
  const [isOpen, setIsOpen] = useState<boolean | undefined>();
  const defaultOpen = useRef<boolean | undefined>();
  useEffect(() => {
    if (collapseSignal > 0) setIsOpen(false);
  }, [collapseSignal]);
  const accordionId = useGeneratedHtmlId({ prefix: 'nightshiftConnectedConnectors' });

  if (isLoading || agent.isLoading) return null;
  if (error || agent.error) {
    return (
      <SandboxConnectorsError
        onRetry={() => {
          if (error) void refetch();
          if (agent.error) agent.refetch();
        }}
        data-test-subj="nightshiftConnectedConnectorsError"
      />
    );
  }
  const connected = (data?.connectors ?? []).filter(({ id }) => agent.assignedIds.includes(id));
  const isEmpty = connected.length === 0;
  if (defaultOpen.current === undefined) defaultOpen.current = isEmpty;
  const isExpanded = isOpen ?? defaultOpen.current;

  return (
    <EuiAccordion
      id={accordionId}
      forceState={isExpanded ? 'open' : 'closed'}
      onToggle={setIsOpen}
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <h3>
                {i18n.translate('xpack.nightshift.connectedConnectors.title', {
                  defaultMessage: 'Connected',
                })}
              </h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={isEmpty ? 'hollow' : 'success'}
              data-test-subj="nightshiftConnectedConnectorsCount"
            >
              {connected.length}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      data-test-subj="nightshiftConnectedConnectors"
    >
      <EuiSpacer size="m" />
      {!isEmpty && (
        <>
          <div css={sourceGridThreeColumnsStyles} role="list">
            {connected.map((connector) => (
              <ConnectedConnectorCard key={connector.id} connector={connector} />
            ))}
          </div>
          <EuiSpacer size="m" />
        </>
      )}
      {agent.hasConnectorsAllPrivileges && agent.canEditAgent && (
        <EuiFlexGroup
          gutterSize="m"
          alignItems="center"
          responsive={false}
          data-test-subj="nightshiftConnectedConnectorsActions"
        >
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="plusCircle"
              onClick={agent.openLibrary}
              data-test-subj="nightshiftAddConnectorButton"
            >
              {i18n.translate('xpack.nightshift.connectedConnectors.addButton', {
                defaultMessage: 'Add connector',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {agent.flyouts}
    </EuiAccordion>
  );
}

function ConnectedConnectorCard({
  connector,
}: {
  connector: SandboxConnector;
}): React.ReactElement {
  const { triggersActionsUi } = useKibana().services;
  const registry = triggersActionsUi?.actionTypeRegistry;
  const model = registry?.has(connector.connector_type_id)
    ? registry.get(connector.connector_type_id)
    : undefined;
  const { canEdit, openEdit, editFlyout } = useEditConnector();

  return (
    <>
      <SourceCard
        connected
        icon={model?.iconClass ?? 'plugs'}
        title={connector.name}
        description={model?.actionTypeTitle ?? connector.connector_type_id}
        data-test-subj={`nightshiftConnectedConnectorCard-${connector.id}`}
        action={{
          label: i18n.translate('xpack.nightshift.connectedConnectors.editButton', {
            defaultMessage: 'Edit connector',
          }),
          icon: 'pencil',
          onClick: () => openEdit(connector),
          disabledReason: connector.is_preconfigured
            ? preconfiguredTooltip
            : canEdit
            ? undefined
            : noPermissionTooltip,
          'data-test-subj': `nightshiftEditConnector-${connector.id}`,
        }}
      />
      {editFlyout}
    </>
  );
}
