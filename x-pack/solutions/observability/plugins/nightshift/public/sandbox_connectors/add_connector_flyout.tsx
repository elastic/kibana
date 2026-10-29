/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiButton,
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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { checkActionTypeEnabled } from '@kbn/alerts-ui-shared/src/check_action_type_enabled';
import { useKibana } from '../hooks/use_kibana';
import { useConnectorsByType, type ConnectorTypeGroup } from './use_connectors_by_type';
import { useAgentConnectors } from './use_agent_connectors';
import { useAddConnectorFlyout } from './use_add_connector_flyout';
import { useEditConnector } from './use_edit_connector';
import { useDeleteConnector } from './use_delete_connector';
import { getSourceCardItem } from './source_card_item';
import { SandboxConnectorsError } from './sandbox_connectors_error';
import { ConnectorList } from './connector_list';

const noPermissionReason = i18n.translate('xpack.nightshift.addConnectorFlyout.noPermission', {
  defaultMessage: 'You need permission to create connectors and to edit the investigation agent.',
});

const connectLabel = i18n.translate('xpack.nightshift.addConnectorFlyout.connectButton', {
  defaultMessage: 'Connect',
});

export function AddConnectorFlyout({ onClose }: { onClose: () => void }): React.ReactElement {
  const { application, triggersActionsUi } = useKibana().services;
  const { groups, isLoading, error, typesError, refetch } = useConnectorsByType();
  const { canEditAgent } = useAgentConnectors();
  const { openAdd, addFlyout } = useAddConnectorFlyout();
  const { canEdit, openEdit, editFlyout } = useEditConnector();
  const { requestDelete, confirmModal } = useDeleteConnector();
  const titleId = useGeneratedHtmlId({ prefix: 'nightshiftAddConnectorFlyout' });

  const canCreate = application.capabilities.actions?.save === true && canEditAgent;
  const canDelete = application.capabilities.actions?.delete === true;

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
              {groups.map((group) => {
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
                      canOpenDetails={canEdit}
                      onOpenDetails={openEdit}
                      canDelete={canDelete}
                      onDelete={requestDelete}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          ) : null}
        </EuiFlyoutBody>
      </EuiFlyout>
      {addFlyout}
      {editFlyout}
      {confirmModal}
    </>
  );
}

function ConnectorTypeRow({
  group: { actionType, connectors },
  item,
  createDisabledReason,
  onCreate,
  canOpenDetails,
  onOpenDetails,
  canDelete,
  onDelete,
}: {
  group: ConnectorTypeGroup;
  item: ReturnType<typeof getSourceCardItem>;
  createDisabledReason?: string;
  onCreate: () => void;
} & Pick<
  React.ComponentProps<typeof ConnectorList>,
  'canOpenDetails' | 'onOpenDetails' | 'canDelete' | 'onDelete'
>): React.ReactElement {
  const accordionId = useGeneratedHtmlId({ prefix: 'nightshiftConnectorType' });
  const connectButton = (
    <EuiButton
      size="s"
      iconType="plugs"
      isDisabled={createDisabledReason !== undefined}
      onClick={onCreate}
      aria-label={`${connectLabel} ${item.name}`}
      data-test-subj={`${actionType.id}-connect`}
    >
      {connectLabel}
    </EuiButton>
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj={`${actionType.id}-row`}>
      <EuiAccordion
        id={accordionId}
        buttonContent={
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={item.iconClass} size="l" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{item.name}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued" data-test-subj={`${actionType.id}-count`}>
                {i18n.translate('xpack.nightshift.addConnectorFlyout.connectorCount', {
                  defaultMessage:
                    '{count, plural, =0 {No connectors} one {# connector} other {# connectors}}',
                  values: { count: connectors.length },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        buttonProps={{ 'data-test-subj': `${actionType.id}-toggle` }}
        extraAction={
          createDisabledReason === undefined ? (
            connectButton
          ) : (
            <EuiToolTip position="top" content={createDisabledReason}>
              {connectButton}
            </EuiToolTip>
          )
        }
      >
        <EuiSpacer size="s" />
        {connectors.length > 0 ? (
          <ConnectorList
            connectors={connectors}
            canOpenDetails={canOpenDetails}
            onOpenDetails={onOpenDetails}
            canDelete={canDelete}
            onDelete={onDelete}
            data-test-subj={`${actionType.id}-connectors`}
          />
        ) : (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.nightshift.addConnectorFlyout.noConnectors', {
                defaultMessage: 'No {type} connectors in this space yet.',
                values: { type: item.name },
              })}
            </p>
          </EuiText>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
}
