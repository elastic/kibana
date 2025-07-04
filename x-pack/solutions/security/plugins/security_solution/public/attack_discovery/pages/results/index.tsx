/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { AIConnector } from '@kbn/elastic-assistant';
import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import type {
  AttackDiscovery,
  AttackDiscoveryStats,
  GenerationInterval,
  Replacements,
} from '@kbn/elastic-assistant-common';
import React from 'react';

import { Current } from './current';
import { EmptyStates } from './empty_states';
import { showEmptyStates } from './empty_states/helpers/show_empty_states';
import { History } from './history';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

interface Props {
  aiConnectors: AIConnector[] | undefined;
  alertsContextCount: number | null; // null when unavailable for the current connector
  alertsCount: number;
  approximateFutureTime: Date | null;
  attackDiscoveriesCount: number;
  connectorId: string | undefined;
  connectorIntervals: GenerationInterval[];
  end?: string | null;
  failureReason: string | null;
  isLoading: boolean;
  isLoadingPost: boolean;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  loadingConnectorId: string | null;
  onGenerate: () => Promise<void>;
  onToggleShowAnonymized: () => void;
  selectedConnectorAttackDiscoveries: AttackDiscovery[];
  selectedConnectorLastUpdated: Date | null;
  selectedConnectorReplacements: Replacements;
  showAnonymized: boolean;
  start?: string | null;
  stats: AttackDiscoveryStats | null;
}

const ResultsComponent: React.FC<Props> = ({
  aiConnectors,
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
  localStorageAttackDiscoveryMaxAlerts,
  loadingConnectorId,
  onGenerate,
  onToggleShowAnonymized,
  selectedConnectorAttackDiscoveries,
  selectedConnectorLastUpdated,
  selectedConnectorReplacements,
  showAnonymized,
  start,
  stats,
}) => {
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  const aiConnectorsCount = aiConnectors?.length ?? null; // null when connectors are not configured

  if (
    !attackDiscoveryAlertsEnabled &&
    showEmptyStates({
      aiConnectorsCount,
      alertsContextCount,
      attackDiscoveriesCount,
      connectorId,
      failureReason,
      isLoading,
    })
  ) {
    return (
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
    );
  }

  return (
    <>
      {attackDiscoveryAlertsEnabled ? (
        <>
          <EuiSpacer size="s" />

          <History
            aiConnectors={aiConnectors}
            localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
            onGenerate={onGenerate}
            onToggleShowAnonymized={onToggleShowAnonymized}
            showAnonymized={showAnonymized}
          />
        </>
      ) : (
        <Current
          aiConnectorsCount={aiConnectorsCount}
          alertsContextCount={alertsContextCount}
          alertsCount={alertsCount}
          approximateFutureTime={approximateFutureTime}
          attackDiscoveriesCount={attackDiscoveriesCount}
          connectorId={connectorId}
          connectorIntervals={connectorIntervals}
          end={end}
          failureReason={failureReason}
          isLoading={isLoading}
          isLoadingPost={isLoadingPost}
          loadingConnectorId={loadingConnectorId}
          localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
          onGenerate={onGenerate}
          onToggleShowAnonymized={onToggleShowAnonymized}
          selectedConnectorAttackDiscoveries={selectedConnectorAttackDiscoveries}
          selectedConnectorLastUpdated={selectedConnectorLastUpdated}
          selectedConnectorReplacements={selectedConnectorReplacements}
          showAnonymized={showAnonymized}
          start={start}
          stats={stats}
        />
      )}
    </>
  );
};

ResultsComponent.displayName = 'Results';

export const Results = React.memo(ResultsComponent);
