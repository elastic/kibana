/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiIcon,
  EuiPanel,
  EuiLoadingSpinner,
  EuiText,
  EuiLink,
  EuiTextColor,
} from '@elastic/eui';
import { css } from '@emotion/css';
import {
  ConnectorAddModal,
  type ActionConnector,
} from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { ActionType } from '@kbn/actions-plugin/common';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useFilteredActionTypes } from './hooks/use_load_action_types';

const usePanelCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    .connectorSelectorPanel {
      height: 160px;
      &.euiPanel:hover {
        background-color: ${euiTheme.colors.lightestShade};
      }
    }
  `;
};

interface ConnectorSetupProps {
  onConnectorSaved?: (savedAction: ActionConnector) => void;
  onClose?: () => void;
  compressed?: boolean;
}
export const ConnectorSetup = React.memo<ConnectorSetupProps>(
  ({ onConnectorSaved, onClose, compressed = false }) => {
    const panelCss = usePanelCss();
    const {
      http,
      triggersActionsUi: { actionTypeRegistry },
      notifications: { toasts },
    } = useKibana().services;
    const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

    const onModalClose = useCallback(() => {
      setSelectedActionType(null);
      onClose?.();
    }, [onClose]);

    const actionTypes = useFilteredActionTypes(http, toasts);

    if (!actionTypes) {
      return <EuiLoadingSpinner />;
    }

    return (
      <>
        {compressed ? (
          <EuiListGroup
            flush
            data-test-subj="connectorSetupCompressed"
            listItems={actionTypes.map((actionType) => ({
              key: actionType.id,
              id: actionType.id,
              label: actionType.name,
              size: 's',
              icon: (
                <EuiIcon
                  size="l"
                  color="text"
                  type={actionTypeRegistry.get(actionType.id).iconClass}
                />
              ),
              isDisabled: !actionType.enabled,
              onClick: () => setSelectedActionType(actionType),
            }))}
          />
        ) : (
          <EuiFlexGroup gutterSize="l">
            {actionTypes.map((actionType: ActionType) => (
              <EuiFlexItem key={actionType.id}>
                <EuiLink
                  color="text"
                  onClick={() => setSelectedActionType(actionType)}
                  data-test-subj={`actionType-${actionType.id}`}
                  className={panelCss}
                >
                  <EuiPanel
                    hasShadow={false}
                    hasBorder
                    paddingSize="m"
                    className="connectorSelectorPanel"
                  >
                    <EuiFlexGroup
                      direction="column"
                      alignItems="center"
                      justifyContent="center"
                      gutterSize="s"
                      className={css`
                        height: 100%;
                      `}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          size="xxl"
                          color="text"
                          type={actionTypeRegistry.get(actionType.id).iconClass}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiTextColor color="default">
                          <EuiText size="s">{actionType.name}</EuiText>
                        </EuiTextColor>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiLink>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}

        {selectedActionType && (
          <ConnectorAddModal
            actionTypeRegistry={actionTypeRegistry}
            actionType={selectedActionType}
            onClose={onModalClose}
            postSaveEventHandler={onConnectorSaved}
          />
        )}
      </>
    );
  }
);
ConnectorSetup.displayName = 'ConnectorSetup';
