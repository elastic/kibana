/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import React from 'react';

import { AttackDiscoveryPanel } from './attack_discovery_panel';
import { EmptyStates } from './empty_states';
import { showEmptyStates } from './empty_states/helpers/show_empty_states';
import { getInitialIsOpen, showSummary } from '../helpers';
import { Summary } from './summary';

interface Props {
  aiConnectorsCount: number | null; // null when connectors are not configured
  alertsContextCount: number | null; // null when unavailable for the current connector
  alertsCount: number;
  attackDiscoveriesCount: number;
  connectorId: string | undefined;
  failureReason: string | null;
  isLoading: boolean;
  isLoadingPost: boolean;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  onGenerate: () => Promise<void>;
  onToggleShowAnonymized: () => void;
  selectedConnectorAttackDiscoveries: AttackDiscovery[];
  selectedConnectorLastUpdated: Date | null;
  selectedConnectorReplacements: Replacements;
  showAnonymized: boolean;
}

const ResultsComponent: React.FC<Props> = ({
  aiConnectorsCount,
  alertsContextCount,
  alertsCount,
  attackDiscoveriesCount,
  connectorId,
  failureReason,
  isLoading,
  isLoadingPost,
  localStorageAttackDiscoveryMaxAlerts,
  onGenerate,
  onToggleShowAnonymized,
  selectedConnectorAttackDiscoveries,
  selectedConnectorLastUpdated,
  selectedConnectorReplacements,
  showAnonymized,
}) => {
  if (
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
      {showSummary(attackDiscoveriesCount) && (
        <Summary
          alertsCount={alertsCount}
          attackDiscoveriesCount={attackDiscoveriesCount}
          lastUpdated={selectedConnectorLastUpdated}
          onToggleShowAnonymized={onToggleShowAnonymized}
          showAnonymized={showAnonymized}
        />
      )}

      {selectedConnectorAttackDiscoveries.map((attackDiscovery, i) => (
        <React.Fragment key={attackDiscovery.id}>
          <AttackDiscoveryPanel
            attackDiscovery={attackDiscovery}
            initialIsOpen={getInitialIsOpen(i)}
            showAnonymized={showAnonymized}
            replacements={selectedConnectorReplacements}
          />
          <EuiSpacer size="l" />
        </React.Fragment>
      ))}
    </>
  );
};

ResultsComponent.displayName = 'Results';

export const Results = React.memo(ResultsComponent);
