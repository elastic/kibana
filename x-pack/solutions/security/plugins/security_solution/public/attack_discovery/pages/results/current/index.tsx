/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import type {
  AttackDiscovery,
  AttackDiscoveryAlert,
  AttackDiscoveryStats,
  GenerationInterval,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { noop } from 'lodash/fp';
import React from 'react';

import { AttackDiscoveryPanel } from '../attack_discovery_panel';
import { EmptyStates } from '../empty_states';
import { showEmptyStates } from '../empty_states/helpers/show_empty_states';
import { getInitialIsOpen, showLoading, showSummary } from '../../helpers';
import { LoadingCallout } from '../../loading_callout';
import { Summary } from '../summary';

interface Props {
  aiConnectorsCount: number | null;
  alertsContextCount: number | null;
  alertsCount: number;
  approximateFutureTime: Date | null;
  attackDiscoveriesCount: number;
  connectorId: string | undefined;
  connectorIntervals: GenerationInterval[];
  end?: string | null;
  failureReason: string | null;
  isLoading: boolean;
  isLoadingPost: boolean;
  loadingConnectorId: string | null;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  onGenerate: () => Promise<void>;
  onToggleShowAnonymized: () => void;
  selectedConnectorAttackDiscoveries: AttackDiscovery[];
  selectedConnectorLastUpdated: Date | null;
  selectedConnectorReplacements: Replacements;
  showAnonymized: boolean;
  start?: string | null;
  stats: AttackDiscoveryStats | null;
}

const EMPTY_SELECTED_ATTACK_DISCOVERIES: Record<string, boolean> = {}; // constant reference to avoid re-renders
const EMPTY_SELECTED_CONNECTOR_ATTACK_DISCOVERIES: AttackDiscoveryAlert[] = []; // constant reference to avoid re-renders

const CurrentComponent: React.FC<Props> = ({
  aiConnectorsCount,
  alertsContextCount,
  alertsCount,
  approximateFutureTime,
  attackDiscoveriesCount,
  connectorId,
  connectorIntervals,
  end,
  failureReason,
  isLoading,
  isLoadingPost,
  loadingConnectorId,
  localStorageAttackDiscoveryMaxAlerts,
  onGenerate,
  onToggleShowAnonymized,
  selectedConnectorAttackDiscoveries,
  selectedConnectorLastUpdated,
  selectedConnectorReplacements,
  showAnonymized,
  start,
  stats,
}) => (
  <>
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={true}>
        {showSummary(attackDiscoveriesCount) && (
          <Summary
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            lastUpdated={selectedConnectorLastUpdated}
            onToggleShowAnonymized={onToggleShowAnonymized}
            selectedAttackDiscoveries={EMPTY_SELECTED_ATTACK_DISCOVERIES}
            selectedConnectorAttackDiscoveries={EMPTY_SELECTED_CONNECTOR_ATTACK_DISCOVERIES}
            setSelectedAttackDiscoveries={noop}
            showAnonymized={showAnonymized}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>

    <EuiSpacer />

    {showLoading({
      attackDiscoveriesCount,
      connectorId,
      isLoading: isLoading || isLoadingPost,
      loadingConnectorId,
    }) ? (
      <LoadingCallout
        alertsContextCount={alertsContextCount}
        approximateFutureTime={approximateFutureTime}
        connectorIntervals={connectorIntervals}
        end={end}
        localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
        start={start}
      />
    ) : (
      <>
        {showEmptyStates({
          aiConnectorsCount,
          alertsContextCount,
          attackDiscoveriesCount,
          connectorId,
          failureReason,
          isLoading,
        }) ? (
          <>
            <EuiSpacer size="xxl" />
            <EmptyStates
              aiConnectorsCount={aiConnectorsCount}
              alertsContextCount={alertsContextCount}
              attackDiscoveriesCount={attackDiscoveriesCount}
              failureReason={failureReason}
              connectorId={connectorId}
              isLoading={isLoading || isLoadingPost}
              onGenerate={onGenerate}
              upToAlertsCount={Number(
                localStorageAttackDiscoveryMaxAlerts ?? DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS
              )}
            />
          </>
        ) : (
          <>
            {selectedConnectorAttackDiscoveries.map((attackDiscovery, i) => (
              <React.Fragment key={attackDiscovery.id}>
                <AttackDiscoveryPanel
                  attackDiscovery={attackDiscovery}
                  isSelected={false}
                  initialIsOpen={getInitialIsOpen(i)}
                  setSelectedAttackDiscoveries={noop}
                  showAnonymized={showAnonymized}
                  replacements={selectedConnectorReplacements}
                />
                <EuiSpacer size="l" />
              </React.Fragment>
            ))}
          </>
        )}
      </>
    )}
  </>
);

CurrentComponent.displayName = 'CurrentComponent';

export const Current = React.memo(CurrentComponent);
