/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
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
import { useEditConnector } from './use_edit_connector';
import { SandboxConnectorsError } from './sandbox_connectors_error';
import { SourceCard } from './source_card';
import { sourceGridStyles } from './source_grid_styles';

const preconfiguredTooltip = i18n.translate('xpack.nightshift.connectedConnectors.preconfigured', {
  defaultMessage: 'This connector is configured in kibana.yml and cannot be changed here.',
});

const noPermissionTooltip = i18n.translate('xpack.nightshift.connectedConnectors.noPermission', {
  defaultMessage: 'You need permission to edit connectors.',
});

export function ConnectedConnectors({
  collapseSignal = 0,
}: {
  collapseSignal?: number;
}): React.ReactElement | null {
  const { data, error, isLoading, refetch } = useFetchSandboxConnectors();
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (collapseSignal > 0) setIsOpen(false);
  }, [collapseSignal]);
  const accordionId = useGeneratedHtmlId({ prefix: 'nightshiftConnectedConnectors' });

  if (isLoading) return null;
  if (error) {
    return (
      <SandboxConnectorsError
        onRetry={() => refetch()}
        data-test-subj="nightshiftConnectedConnectorsError"
      />
    );
  }
  if (!data || data.connectors.length === 0) return null;

  return (
    <EuiAccordion
      id={accordionId}
      forceState={isOpen ? 'open' : 'closed'}
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
            <EuiBadge color="success">{data.connectors.length}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      data-test-subj="nightshiftConnectedConnectors"
    >
      <EuiSpacer size="m" />
      <div css={sourceGridStyles} role="list">
        {data.connectors.map((connector) => (
          <ConnectedConnectorCard key={connector.id} connector={connector} />
        ))}
      </div>
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
        badge={
          connector.enabled ? undefined : (
            <EuiBadge color="hollow" data-test-subj={`nightshiftConnectorOff-${connector.id}`}>
              {i18n.translate('xpack.nightshift.connectedConnectors.offBadge', {
                defaultMessage: 'Off',
              })}
            </EuiBadge>
          )
        }
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
