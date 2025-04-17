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
import type { AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { StatusBell } from './status_bell';
import * as i18n from './translations';

interface Props {
  connectorId: string | undefined;
  connectorsAreConfigured: boolean;
  isLoading: boolean;
  isDisabledActions: boolean;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  onGenerate: () => void;
  onCancel: () => void;
  onConnectorIdSelected: (connectorId: string) => void;
  openFlyout: () => void;
  setLocalStorageAttackDiscoveryMaxAlerts: React.Dispatch<React.SetStateAction<string | undefined>>;
  stats: AttackDiscoveryStats | null;
}

const HeaderComponent: React.FC<Props> = ({
  connectorId,
  connectorsAreConfigured,
  isLoading,
  isDisabledActions,
  localStorageAttackDiscoveryMaxAlerts,
  onGenerate,
  onConnectorIdSelected,
  onCancel,
  openFlyout,
  setLocalStorageAttackDiscoveryMaxAlerts,
  stats,
}) => {
  const { euiTheme } = useEuiTheme();
  const disabled = connectorId == null;

  const [didCancel, setDidCancel] = useState(false);

  const handleCancel = useCallback(() => {
    setDidCancel(true);
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (isLoading === false) setDidCancel(false);
  }, [isLoading]);

  const buttonProps = useMemo(
    () =>
      isLoading
        ? {
            dataTestSubj: 'cancel',
            color: 'danger' as EuiButtonProps['color'],
            onClick: handleCancel,
            text: i18n.CANCEL,
          }
        : {
            dataTestSubj: 'generate',
            color: 'primary' as EuiButtonProps['color'],
            onClick: onGenerate,
            text: i18n.GENERATE,
          },
    [isLoading, handleCancel, onGenerate]
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      css={css`
        margin-top: ${euiTheme.size.m};
      `}
      data-test-subj="header"
      gutterSize="none"
    >
      <StatusBell stats={stats} />
      {connectorsAreConfigured && (
        <EuiFlexItem
          css={css`
            margin-left: ${euiTheme.size.s};
            margin-right: ${euiTheme.size.s};
          `}
          grow={false}
        >
          <ConnectorSelectorInline
            onConnectorSelected={noop}
            onConnectorIdSelected={onConnectorIdSelected}
            selectedConnectorId={connectorId}
            stats={stats}
          />
        </EuiFlexItem>
      )}

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

      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={connectorId == null ? i18n.SELECT_A_CONNECTOR : null}
          data-test-subj="generateTooltip"
        >
          <EuiButton
            data-test-subj={buttonProps.dataTestSubj}
            size="s"
            disabled={disabled || didCancel || isDisabledActions}
            color={buttonProps.color}
            onClick={buttonProps.onClick}
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
