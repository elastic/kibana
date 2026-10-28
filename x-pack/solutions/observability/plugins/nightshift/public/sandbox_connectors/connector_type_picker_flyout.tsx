/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { checkActionTypeEnabled } from '@kbn/alerts-ui-shared/src/check_action_type_enabled';
import { useKibana } from '../hooks/use_kibana';
import { useFetchSandboxConnectorTypes } from './use_fetch_sandbox_connector_types';
import { useRefreshSandboxConnectors } from './use_fetch_sandbox_connectors';
import { SandboxConnectorsError } from './sandbox_connectors_error';
import { SourceCard } from './source_card';
import { getSourceCardItem } from './source_card_item';
import { sourceGridStyles } from './source_grid_styles';

export function ConnectorTypePickerFlyout({
  onClose,
  onConnectorCreated,
}: {
  onClose: () => void;
  onConnectorCreated: (connector: { id: string; name: string }) => void;
}): React.ReactElement {
  const { triggersActionsUi } = useKibana().services;
  const { data: types, isLoading, error, refetch } = useFetchSandboxConnectorTypes();
  const refresh = useRefreshSandboxConnectors();
  const [creatingTypeId, setCreatingTypeId] = useState<string | undefined>();
  const titleId = useGeneratedHtmlId();

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        size="m"
        aria-labelledby={titleId}
        data-test-subj="nightshiftConnectorTypePickerFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>
              {i18n.translate('xpack.nightshift.connectorTypePicker.title', {
                defaultMessage: 'Select a connector',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : error ? (
            <SandboxConnectorsError
              title={i18n.translate('xpack.nightshift.connectorTypePicker.loadError', {
                defaultMessage: 'Could not load the connector types.',
              })}
              onRetry={() => refetch()}
              data-test-subj="nightshiftConnectorTypePickerError"
            />
          ) : triggersActionsUi ? (
            <div css={sourceGridStyles} role="list">
              {(types ?? []).map((actionType) => {
                const item = getSourceCardItem({
                  actionType,
                  actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
                });
                const enabledCheck = checkActionTypeEnabled(actionType);
                return (
                  <SourceCard
                    key={actionType.id}
                    icon={item.iconClass}
                    title={item.name}
                    description={item.description}
                    data-test-subj={`${actionType.id}-card`}
                    action={{
                      label: i18n.translate('xpack.nightshift.connectorTypePicker.selectButton', {
                        defaultMessage: 'Select',
                      }),
                      icon: 'plugs',
                      disabledReason: enabledCheck.isEnabled ? undefined : enabledCheck.message,
                      onClick: () => setCreatingTypeId(actionType.id),
                      'data-test-subj': `${actionType.id}-select`,
                    }}
                  />
                );
              })}
            </div>
          ) : null}
        </EuiFlyoutBody>
      </EuiFlyout>
      {creatingTypeId &&
        triggersActionsUi?.getAddConnectorFlyout({
          initialConnector: { actionTypeId: creatingTypeId },
          onClose: () => setCreatingTypeId(undefined),
          onConnectorCreated: (connector) => {
            onConnectorCreated(connector);
            refresh();
            onClose();
          },
        })}
    </>
  );
}
