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
import {
  AssistantSpaceIdProvider,
  ConnectorSelectorInline,
  useAssistantContext,
} from '@kbn/elastic-assistant';
import { type AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ElasticLLMCostAwarenessTour } from '@kbn/elastic-assistant/impl/tour/elastic_llm';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '@kbn/elastic-assistant/impl/tour/const';

import { Actions } from './actions';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import type { SettingsOverrideOptions } from '../results/history/types';
import { SETTINGS_TAB_ID } from '../settings_flyout/constants';
import { StatusBell } from './status_bell';
import * as i18n from './translations';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

interface Props {
  connectorId: string | undefined;
  connectorsAreConfigured: boolean;
  isLoading: boolean;
  isDisabledActions: boolean;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
  onCancel: () => void;
  onConnectorIdSelected: (connectorId: string) => void;
  openFlyout: (tabId: string) => void;
  stats: AttackDiscoveryStats | null;
  showFlyout: boolean;
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
  showFlyout,
}) => {
  const { euiTheme } = useEuiTheme();
  const isDisabled = connectorId == null;
  const [didCancel, setDidCancel] = useState(false);
  const { inferenceEnabled } = useAssistantContext();
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();
  const spaceId = useSpaceId();

  const [isEISCostTourDisabled, setIsEISCostTourDisabled] = useState<boolean>(
    attackDiscoveryAlertsEnabled ||
      !connectorsAreConfigured ||
      !spaceId ||
      !inferenceEnabled ||
      showFlyout
  );

  useEffect(() => {
    if (
      attackDiscoveryAlertsEnabled ||
      !connectorsAreConfigured ||
      !spaceId ||
      !inferenceEnabled ||
      showFlyout
    ) {
      setIsEISCostTourDisabled(true);
    } else {
      setIsEISCostTourDisabled(false);
    }
  }, [
    attackDiscoveryAlertsEnabled,
    connectorsAreConfigured,
    inferenceEnabled,
    isEISCostTourDisabled,
    showFlyout,
    spaceId,
  ]);

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
            onClick: () => onGenerate(),
            text: i18n.GENERATE,
          },
    [attackDiscoveryAlertsEnabled, handleCancel, isLoading, onGenerate]
  );

  const openLegacySettingsFlyout = useCallback(() => openFlyout(SETTINGS_TAB_ID), [openFlyout]);

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
                  data-test-subj="statusBell"
                  grow={false}
                  css={css`
                    margin-left: ${euiTheme.size.s};
                    margin-right: ${euiTheme.size.s};
                  `}
                >
                  <StatusBell stats={stats} />
                </EuiFlexItem>

                <EuiFlexItem>
                  {spaceId && (
                    <AssistantSpaceIdProvider spaceId={spaceId}>
                      <ElasticLLMCostAwarenessTour
                        isDisabled={isEISCostTourDisabled}
                        selectedConnectorId={connectorId}
                        zIndex={999} // Should lower than the flyout
                        storageKey={
                          NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ATTACK_DISCOVERY
                        }
                      >
                        <ConnectorSelectorInline
                          onConnectorSelected={noop}
                          onConnectorIdSelected={onConnectorIdSelected}
                          selectedConnectorId={connectorId}
                          stats={stats}
                        />
                      </ElasticLLMCostAwarenessTour>
                    </AssistantSpaceIdProvider>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Conditional rendering: New Actions component vs Legacy buttons */}
      {attackDiscoveryAlertsEnabled ? (
        /* New Actions component when feature flag is enabled */
        <EuiFlexItem grow={false}>
          <Actions
            isLoading={isLoading}
            onGenerate={onGenerate}
            openFlyout={openFlyout}
            isDisabled={isDisabled}
          />
        </EuiFlexItem>
      ) : (
        /* Legacy settings and generate buttons when feature flag is disabled */
        <>
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
                onClick={openLegacySettingsFlyout}
              />
            </EuiToolTip>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={connectorId == null ? i18n.SELECT_A_CONNECTOR : null}
              data-test-subj="generateTooltip"
            >
              <EuiButton
                color={buttonProps.color}
                data-test-subj={buttonProps.dataTestSubj}
                disabled={isDisabled || didCancel || isDisabledActions}
                fill={buttonProps.fill}
                onClick={buttonProps.onClick}
                size={attackDiscoveryAlertsEnabled ? 'm' : 's'}
              >
                {buttonProps.text}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};

HeaderComponent.displayName = 'Header';
export const Header = React.memo(HeaderComponent);
