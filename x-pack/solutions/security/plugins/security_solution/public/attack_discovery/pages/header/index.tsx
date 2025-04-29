/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { type AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { StatusBell } from './status_bell';
import * as i18n from './translations';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

interface Props {
  connectorId: string | undefined;
  connectorsAreConfigured: boolean;
  isLoading: boolean;
  isDisabledActions: boolean;
  onGenerate: () => void;
  onCancel: () => void;
  onConnectorIdSelected: (connectorId: string) => void;
  openFlyout: () => void;
  stats: AttackDiscoveryStats | null;
}

const HeaderComponent: React.FC<Props> = ({
  connectorId,
  connectorsAreConfigured,
  isLoading,
  isDisabledActions,
  onGenerate,
  onConnectorIdSelected,
  onCancel,
  openFlyout,
  stats,
}) => {
  const { euiTheme } = useEuiTheme();
  const disabled = connectorId == null;
  const [didCancel, setDidCancel] = useState(false);
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  const handleCancel = useCallback(() => {
    setDidCancel(true);
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (isLoading === false) setDidCancel(false);
  }, [isLoading]);

  const buttonProps = useMemo(
    () =>
      isLoading && !attackDiscoveryAlertsEnabled
        ? {
            dataTestSubj: 'cancel',
            color: 'danger' as EuiButtonProps['color'],
            fill: attackDiscoveryAlertsEnabled,
            onClick: handleCancel,
            text: i18n.CANCEL,
          }
        : {
            color: 'primary' as EuiButtonProps['color'],
            dataTestSubj: 'generate',
            fill: attackDiscoveryAlertsEnabled,
            onClick: onGenerate,
            text: i18n.GENERATE,
          },
    [attackDiscoveryAlertsEnabled, handleCancel, isLoading, onGenerate]
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      css={css`
        margin-top: ${attackDiscoveryAlertsEnabled ? 0 : euiTheme.size.m};
      `}
      data-test-subj="header"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          alignItems="center"
          direction={attackDiscoveryAlertsEnabled ? 'rowReverse' : 'row'}
          gutterSize="none"
          responsive={false}
          wrap={false}
        >
          <EuiFlexItem grow={false}>
            {!attackDiscoveryAlertsEnabled && connectorsAreConfigured && (
              <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap={false}>
                <EuiFlexItem
                  grow={false}
                  css={css`
                    margin-left: ${euiTheme.size.s};
                    margin-right: ${euiTheme.size.s};
                  `}
                >
                  <StatusBell stats={stats} />
                </EuiFlexItem>

                <EuiFlexItem>
                  <ConnectorSelectorInline
                    onConnectorSelected={noop}
                    onConnectorIdSelected={onConnectorIdSelected}
                    selectedConnectorId={connectorId}
                    stats={stats}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>

          <EuiFlexItem
            css={css`
              margin-right: ${euiTheme.size.m};
            `}
            grow={false}
          >
            <EuiToolTip content={i18n.SETTINGS} data-test-subj="openAlertSelectionToolTip">
              <EuiButtonIcon
                aria-label={i18n.SETTINGS}
                color="text"
                data-test-subj="openAlertSelection"
                iconType="gear"
                onClick={openFlyout}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={connectorId == null ? i18n.SELECT_A_CONNECTOR : null}
          data-test-subj="generateTooltip"
        >
          <EuiButton
            color={buttonProps.color}
            data-test-subj={buttonProps.dataTestSubj}
            disabled={disabled || didCancel || isDisabledActions}
            fill={buttonProps.fill}
            onClick={buttonProps.onClick}
            size={attackDiscoveryAlertsEnabled ? 'm' : 's'}
          >
            {buttonProps.text}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

HeaderComponent.displayName = 'Header';
export const Header = React.memo(HeaderComponent);
