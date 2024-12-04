/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingLogo, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
  MAX_ALERTS_LOCAL_STORAGE_KEY,
  useAssistantContext,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import type { AttackDiscoveries, Replacements } from '@kbn/elastic-assistant-common';
import { uniq } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { SecurityPageName } from '../../../common/constants';
import { HeaderPage } from '../../common/components/header_page';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { Header } from './header';
import { CONNECTOR_ID_LOCAL_STORAGE_KEY, getSize, showLoading } from './helpers';
import { LoadingCallout } from './loading_callout';
import { PageTitle } from './page_title';
import { Results } from './results';
import { useAttackDiscovery } from './use_attack_discovery';

const AttackDiscoveryPageComponent: React.FC = () => {
  const spaceId = useSpaceId() ?? 'default';

  const { http } = useAssistantContext();
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  // for showing / hiding anonymized data:
  const [showAnonymized, setShowAnonymized] = useState<boolean>(false);
  const onToggleShowAnonymized = useCallback(() => setShowAnonymized((current) => !current), []);

  // get the last selected connector ID from local storage:
  const [localStorageAttackDiscoveryConnectorId, setLocalStorageAttackDiscoveryConnectorId] =
    useLocalStorage<string>(
      `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${spaceId}.${CONNECTOR_ID_LOCAL_STORAGE_KEY}`
    );

  const [localStorageAttackDiscoveryMaxAlerts, setLocalStorageAttackDiscoveryMaxAlerts] =
    useLocalStorage<string>(
      `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${spaceId}.${MAX_ALERTS_LOCAL_STORAGE_KEY}`,
      `${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`
    );

  const [connectorId, setConnectorId] = React.useState<string | undefined>(
    localStorageAttackDiscoveryConnectorId
  );

  // state for the connector loading in the background:
  const [loadingConnectorId, setLoadingConnectorId] = useState<string | null>(null);

  const {
    alertsContextCount,
    approximateFutureTime,
    attackDiscoveries,
    didInitialFetch,
    failureReason,
    fetchAttackDiscoveries,
    generationIntervals,
    onCancel,
    isLoading,
    isLoadingPost,
    lastUpdated,
    replacements,
    stats,
  } = useAttackDiscovery({
    connectorId,
    setLoadingConnectorId,
    size: getSize({
      defaultMaxAlerts: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
      localStorageAttackDiscoveryMaxAlerts,
    }),
  });

  // get last updated from the cached attack discoveries if it exists:
  const [selectedConnectorLastUpdated, setSelectedConnectorLastUpdated] = useState<Date | null>(
    lastUpdated ?? null
  );

  // get cached attack discoveries if they exist:
  const [selectedConnectorAttackDiscoveries, setSelectedConnectorAttackDiscoveries] =
    useState<AttackDiscoveries>(attackDiscoveries ?? []);

  // get replacements from the cached attack discoveries if they exist:
  const [selectedConnectorReplacements, setSelectedConnectorReplacements] = useState<Replacements>(
    replacements ?? {}
  );

  // the number of unique alerts in the attack discoveries:
  const alertsCount = useMemo(
    () =>
      uniq(
        selectedConnectorAttackDiscoveries.flatMap((attackDiscovery) => attackDiscovery.alertIds)
      ).length,
    [selectedConnectorAttackDiscoveries]
  );

  /** The callback when users select a connector ID */
  const onConnectorIdSelected = useCallback(
    (selectedConnectorId: string) => {
      // update the connector ID in local storage:
      setConnectorId(selectedConnectorId);
      setLocalStorageAttackDiscoveryConnectorId(selectedConnectorId);
    },
    [setLocalStorageAttackDiscoveryConnectorId]
  );

  // get connector intervals from generation intervals:
  const connectorIntervals = useMemo(() => generationIntervals ?? [], [generationIntervals]);

  const pageTitle = useMemo(() => <PageTitle />, []);

  const onGenerate = useCallback(async () => fetchAttackDiscoveries(), [fetchAttackDiscoveries]);

  useEffect(() => {
    setSelectedConnectorReplacements(replacements);
    setSelectedConnectorAttackDiscoveries(attackDiscoveries);
    setSelectedConnectorLastUpdated(lastUpdated);
  }, [attackDiscoveries, lastUpdated, replacements]);

  useEffect(() => {
    // If there is only one connector, set it as the selected connector
    if (aiConnectors != null && aiConnectors.length === 1) {
      setConnectorId(aiConnectors[0].id);
    } else if (aiConnectors != null && aiConnectors.length === 0) {
      // connectors have been removed, reset the connectorId and cached Attack discoveries
      setConnectorId(undefined);
      setSelectedConnectorAttackDiscoveries([]);
    }
  }, [aiConnectors]);

  const animatedLogo = useMemo(() => <EuiLoadingLogo logo="logoSecurity" size="xl" />, []);

  const connectorsAreConfigured = aiConnectors != null && aiConnectors.length > 0;
  const attackDiscoveriesCount = selectedConnectorAttackDiscoveries.length;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
      `}
      data-test-subj="fullHeightContainer"
    >
      <div data-test-subj="attackDiscoveryPage">
        <HeaderPage border title={pageTitle}>
          <Header
            connectorId={connectorId}
            connectorsAreConfigured={connectorsAreConfigured}
            isLoading={isLoading}
            // disable header actions before post request has completed
            isDisabledActions={isLoadingPost}
            localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
            onConnectorIdSelected={onConnectorIdSelected}
            onGenerate={onGenerate}
            onCancel={onCancel}
            setLocalStorageAttackDiscoveryMaxAlerts={setLocalStorageAttackDiscoveryMaxAlerts}
            stats={stats}
          />
          <EuiSpacer size="m" />
        </HeaderPage>
        {connectorsAreConfigured && connectorId != null && !didInitialFetch ? (
          <EuiEmptyPrompt data-test-subj="animatedLogo" icon={animatedLogo} />
        ) : (
          <>
            {showLoading({
              attackDiscoveriesCount,
              connectorId,
              isLoading: isLoading || isLoadingPost,
              loadingConnectorId,
            }) ? (
              <LoadingCallout
                alertsContextCount={alertsContextCount}
                localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
                approximateFutureTime={approximateFutureTime}
                connectorIntervals={connectorIntervals}
              />
            ) : (
              <Results
                aiConnectorsCount={aiConnectors?.length ?? null}
                alertsContextCount={alertsContextCount}
                alertsCount={alertsCount}
                attackDiscoveriesCount={attackDiscoveriesCount}
                connectorId={connectorId}
                failureReason={failureReason}
                isLoading={isLoading}
                isLoadingPost={isLoadingPost}
                localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
                onGenerate={onGenerate}
                onToggleShowAnonymized={onToggleShowAnonymized}
                selectedConnectorAttackDiscoveries={selectedConnectorAttackDiscoveries}
                selectedConnectorLastUpdated={selectedConnectorLastUpdated}
                selectedConnectorReplacements={selectedConnectorReplacements}
                showAnonymized={showAnonymized}
              />
            )}
          </>
        )}
        <SpyRoute pageName={SecurityPageName.attackDiscovery} />
      </div>
    </div>
  );
};

AttackDiscoveryPageComponent.displayName = 'AttackDiscoveryPage';

export const AttackDiscoveryPage = React.memo(AttackDiscoveryPageComponent);
