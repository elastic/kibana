/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { fetchConnector } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import {
  useFetchSandboxConnectors,
  useRefreshSandboxConnectors,
} from './use_fetch_sandbox_connectors';
import { SandboxConnectorsError } from './sandbox_connectors_error';

const CONNECTORS_MANAGEMENT_PATH = '/insightsAndAlerting/triggersActionsConnectors';

const preconfiguredTooltip = i18n.translate('xpack.nightshift.connectedConnectors.preconfigured', {
  defaultMessage: 'This connector is configured in kibana.yml and cannot be changed here.',
});

export function ConnectedConnectors({
  collapseSignal = 0,
}: {
  collapseSignal?: number;
}): React.ReactElement | null {
  const { data, error, isLoading, refetch } = useFetchSandboxConnectors();
  const [isOpen, setIsOpen] = useState(true);
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
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.nightshift.connectedConnectors.title', {
                  defaultMessage: 'Connected',
                })}
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="success">{data.connectors.length}</EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      data-test-subj="nightshiftConnectedConnectors"
    >
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={2} gutterSize="m">
        {data.connectors.map((connector) => (
          <EuiFlexItem key={connector.id}>
            <ConnectedConnectorCard connector={connector} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </EuiAccordion>
  );
}

function ConnectedConnectorCard({
  connector,
}: {
  connector: SandboxConnector;
}): React.ReactElement {
  const { application, http, notifications, triggersActionsUi } = useKibana().services;
  const refresh = useRefreshSandboxConnectors();
  const registry = triggersActionsUi?.actionTypeRegistry;
  const model = registry?.has(connector.connector_type_id)
    ? registry.get(connector.connector_type_id)
    : undefined;
  const typeTitle = model?.actionTypeTitle ?? connector.connector_type_id;
  const canEdit = Boolean(triggersActionsUi) && application.capabilities.actions?.save === true;
  const canDelete = application.capabilities.actions?.delete === true;
  const isLocked = connector.is_preconfigured;

  const [editing, setEditing] = useState<ActionConnector | undefined>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const confirmTitleId = useGeneratedHtmlId({ prefix: 'nightshiftDeleteConnector' });

  const openEdit = useCallback(async () => {
    try {
      setEditing(await fetchConnector(connector.id, { http }));
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: i18n.translate('xpack.nightshift.connectedConnectors.loadError', {
          defaultMessage: 'Could not load connector {name}',
          values: { name: connector.name },
        }),
      });
    }
  }, [connector.id, connector.name, http, notifications.toasts]);

  const editFlyout = useMemo(() => {
    if (!editing || !triggersActionsUi) return null;
    return triggersActionsUi.getEditConnectorFlyout({
      connector: editing,
      onClose: () => setEditing(undefined),
      onConnectorUpdated: () => {
        refresh();
        setEditing(undefined);
      },
    });
  }, [editing, refresh, triggersActionsUi]);

  const deleteConnector = useCallback(async () => {
    setIsConfirmingDelete(false);
    try {
      await http.delete(`/api/actions/connector/${encodeURIComponent(connector.id)}`);
      refresh();
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: i18n.translate('xpack.nightshift.connectedConnectors.deleteError', {
          defaultMessage: 'Could not delete connector {name}',
          values: { name: connector.name },
        }),
      });
    }
  }, [connector.id, connector.name, http, notifications.toasts, refresh]);

  const menuLabel = i18n.translate('xpack.nightshift.connectedConnectors.menuLabel', {
    defaultMessage: 'More actions for {name}',
    values: { name: connector.name },
  });

  const editButton = (
    <EuiButton
      size="s"
      iconType="pencil"
      onClick={openEdit}
      isDisabled={!canEdit || isLocked}
      data-test-subj={`nightshiftEditConnector-${connector.id}`}
    >
      {i18n.translate('xpack.nightshift.connectedConnectors.editButton', {
        defaultMessage: 'Edit connector',
      })}
    </EuiButton>
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={`nightshiftConnectedConnectorCard-${connector.id}`}
    >
      <EuiFlexGroup direction="column" gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="check" size="xl" color="success" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                aria-label={menuLabel}
                button={
                  <EuiToolTip content={menuLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="boxesVertical"
                      aria-label={menuLabel}
                      onClick={() => setIsMenuOpen((open) => !open)}
                      data-test-subj={`nightshiftConnectorMenu-${connector.id}`}
                    />
                  </EuiToolTip>
                }
                isOpen={isMenuOpen}
                closePopover={() => setIsMenuOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downRight"
              >
                <EuiContextMenuPanel
                  items={[
                    <EuiContextMenuItem
                      key="manage"
                      icon="managementApp"
                      href={application.getUrlForApp('management', {
                        path: CONNECTORS_MANAGEMENT_PATH,
                      })}
                      data-test-subj={`nightshiftConnectorOpenManagement-${connector.id}`}
                    >
                      {i18n.translate('xpack.nightshift.connectedConnectors.openManagement', {
                        defaultMessage: 'Open in Stack Management',
                      })}
                    </EuiContextMenuItem>,
                    <EuiContextMenuItem
                      key="delete"
                      icon="trash"
                      disabled={!canDelete || isLocked}
                      toolTipContent={isLocked ? preconfiguredTooltip : undefined}
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsConfirmingDelete(true);
                      }}
                      data-test-subj={`nightshiftConnectorDelete-${connector.id}`}
                    >
                      {i18n.translate('xpack.nightshift.connectedConnectors.deleteAction', {
                        defaultMessage: 'Delete',
                      })}
                    </EuiContextMenuItem>,
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiTitle size="xs">
            <h4>{connector.name}</h4>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>{typeTitle}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {isLocked ? (
                <EuiToolTip content={preconfiguredTooltip}>{editButton}</EuiToolTip>
              ) : (
                editButton
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {editFlyout}
      {isConfirmingDelete && (
        <EuiConfirmModal
          aria-labelledby={confirmTitleId}
          titleProps={{ id: confirmTitleId }}
          title={i18n.translate('xpack.nightshift.connectedConnectors.deleteConfirmTitle', {
            defaultMessage: 'Delete {name}?',
            values: { name: connector.name },
          })}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={deleteConnector}
          cancelButtonText={i18n.translate('xpack.nightshift.connectedConnectors.deleteCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.nightshift.connectedConnectors.deleteConfirm', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          data-test-subj="nightshiftDeleteConnectorConfirm"
        >
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.nightshift.connectedConnectors.deleteConfirmBody', {
                defaultMessage:
                  'The investigation agent will no longer be able to use it. Rules and workflows that reference this connector will stop working.',
              })}
            </p>
          </EuiText>
        </EuiConfirmModal>
      )}
    </EuiPanel>
  );
}
