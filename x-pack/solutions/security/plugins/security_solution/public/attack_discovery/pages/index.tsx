/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';
import {
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
  END_LOCAL_STORAGE_KEY,
  FILTERS_LOCAL_STORAGE_KEY,
  MAX_ALERTS_LOCAL_STORAGE_KEY,
  QUERY_LOCAL_STORAGE_KEY,
  START_LOCAL_STORAGE_KEY,
  useAssistantContext,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import type { Filter, Query } from '@kbn/es-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { ATTACKS_ALERTS_ALIGNMENT_ENABLED, SecurityPageName } from '../../../common/constants';
import { HeaderPage } from '../../common/components/header_page';
import { useInvalidFilterQuery } from '../../common/hooks/use_invalid_filter_query';
import { useKibana } from '../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../common/lib/kuery';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { Actions } from './header/actions';
import { CONNECTOR_ID_LOCAL_STORAGE_KEY, getDefaultQuery, getSize } from './helpers';
import { deserializeQuery } from './local_storage/deserialize_query';
import { deserializeFilters } from './local_storage/deserialize_filters';
import { PageTitle } from './page_title';
import { History } from './results/history';
import type { SettingsOverrideOptions } from './results/history/types';
import { SettingsFlyout } from './settings_flyout';
import { SETTINGS_TAB_ID } from './settings_flyout/constants';
import { parseFilterQuery } from './settings_flyout/parse_filter_query';
import { useAttackDiscovery } from './use_attack_discovery';
import { useInvalidateGetAttackDiscoveryGenerations } from './use_get_attack_discovery_generations';
import { getConnectorNameFromId } from './utils/get_connector_name_from_id';
import { MovingAttacksCallout } from './moving_attacks_callout';

export const ID = 'attackDiscoveryQuery';

const AttackDiscoveryPageComponent: React.FC = () => {
  const {
    services: { featureFlags, uiSettings, settings },
  } = useKibana();

  const { http, inferenceEnabled } = useAssistantContext();
  const { data: aiConnectors } = useLoadConnectors({
    http,
    inferenceEnabled,
    settings,
  });

  // for showing / hiding anonymized data:
  const [showAnonymized, setShowAnonymized] = useState<boolean>(false);

  // showing / hiding the flyout:
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const [defaultSelectedTabId, setDefaultSelectedTabId] = useState<string>(SETTINGS_TAB_ID);
  const openFlyout = useCallback((tabId: string) => {
    setDefaultSelectedTabId(tabId);
    setShowFlyout(true);
  }, []);

  // time selection:
  const [start, setStart] = useLocalStorage<string>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${START_LOCAL_STORAGE_KEY}`,
    DEFAULT_START
  );
  const [end, setEnd] = useLocalStorage<string>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${END_LOCAL_STORAGE_KEY}`,
    DEFAULT_END
  );

  // search bar query:
  const [query, setQuery] = useLocalStorage<Query>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${QUERY_LOCAL_STORAGE_KEY}`,
    getDefaultQuery(),
    {
      raw: false,
      serializer: (value: Query) => JSON.stringify(value),
      deserializer: deserializeQuery,
    }
  );

  // search bar filters:
  const [filters, setFilters] = useLocalStorage<Filter[]>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${FILTERS_LOCAL_STORAGE_KEY}`,
    [],
    {
      raw: false,
      serializer: (value: Filter[]) => JSON.stringify(value),
      deserializer: deserializeFilters,
    }
  );

  const onToggleShowAnonymized = useCallback(() => setShowAnonymized((current) => !current), []);

  // get the last selected connector ID from local storage:
  const [localStorageAttackDiscoveryConnectorId, setLocalStorageAttackDiscoveryConnectorId] =
    useLocalStorage<string>(
      `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${CONNECTOR_ID_LOCAL_STORAGE_KEY}`
    );

  const [localStorageAttackDiscoveryMaxAlerts, setLocalStorageAttackDiscoveryMaxAlerts] =
    useLocalStorage<string>(
      `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${MAX_ALERTS_LOCAL_STORAGE_KEY}`,
      `${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`
    );

  const [connectorId, setConnectorId] = React.useState<string | undefined>(
    localStorageAttackDiscoveryConnectorId
  );

  const connectorName = useMemo(
    () => getConnectorNameFromId({ aiConnectors, connectorId }),
    [aiConnectors, connectorId]
  );

  const { fetchAttackDiscoveries, isLoading } = useAttackDiscovery({
    connectorId,
    connectorName,
    size: getSize({
      defaultMaxAlerts: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
      localStorageAttackDiscoveryMaxAlerts,
    }),
  });

  /** The callback when users select a connector ID */
  const onConnectorIdSelected = useCallback(
    (selectedConnectorId: string) => {
      // update the connector ID in local storage:
      setConnectorId(selectedConnectorId);
      setLocalStorageAttackDiscoveryConnectorId(selectedConnectorId);
    },
    [setLocalStorageAttackDiscoveryConnectorId]
  );

  const pageTitle = useMemo(() => <PageTitle />, []);

  const { dataView: experimentalDataView } = useDataView();

  // filterQuery is the combined search bar query and filters in ES format:
  const [filterQuery, kqlError] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        dataView: experimentalDataView,
        queries: [query ?? getDefaultQuery()], // <-- search bar query
        filters: filters ?? [], // <-- search bar filters
      }),
    [experimentalDataView, filters, query, uiSettings]
  );

  // renders a toast if the filter query is invalid:
  useInvalidFilterQuery({
    id: ID,
    filterQuery,
    kqlError,
    query,
    startDate: start,
    endDate: end,
  });

  const invalidateGetAttackDiscoveryGenerations = useInvalidateGetAttackDiscoveryGenerations();

  const onGenerate = useCallback(
    async (overrideOptions?: SettingsOverrideOptions) => {
      const size = getSize({
        defaultMaxAlerts: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
        localStorageAttackDiscoveryMaxAlerts,
      });
      const filter = parseFilterQuery({ filterQuery, kqlError });

      try {
        return await fetchAttackDiscoveries({
          end,
          filter, // <-- combined search bar query and filters
          size,
          start,
          overrideConnectorId: overrideOptions?.overrideConnectorId,
          overrideEnd: overrideOptions?.overrideEnd,
          overrideFilter: overrideOptions?.overrideFilter,
          overrideSize: overrideOptions?.overrideSize,
          overrideStart: overrideOptions?.overrideStart,
        });
      } finally {
        invalidateGetAttackDiscoveryGenerations();
      }
    },
    [
      end,
      fetchAttackDiscoveries,
      filterQuery,
      invalidateGetAttackDiscoveryGenerations,
      kqlError,
      localStorageAttackDiscoveryMaxAlerts,
      start,
    ]
  );

  useEffect(() => {
    // If there is only one connector, set it as the selected connector
    if (aiConnectors != null && aiConnectors.length === 1) {
      setConnectorId(aiConnectors[0].id);
    } else if (aiConnectors != null && aiConnectors.length === 0) {
      // connectors have been removed, reset the connectorId and cached Attack discoveries
      setConnectorId(undefined);
    }
  }, [aiConnectors]);

  const onClose = useCallback(() => setShowFlyout(false), []);

  const attacksAlertsAlignmentEnabled = featureFlags.getBooleanValue(
    ATTACKS_ALERTS_ALIGNMENT_ENABLED,
    false
  );

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
          <Actions
            isLoading={isLoading}
            onGenerate={onGenerate}
            openFlyout={openFlyout}
            isDisabled={connectorId == null}
          />
          <EuiSpacer size={'s'} />
        </HeaderPage>

        <EuiSpacer size="s" />

        {attacksAlertsAlignmentEnabled && (
          <>
            <MovingAttacksCallout />
            <EuiSpacer size="s" />
          </>
        )}

        <History
          aiConnectors={aiConnectors}
          localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
          onGenerate={onGenerate}
          onToggleShowAnonymized={onToggleShowAnonymized}
          showAnonymized={showAnonymized}
        />

        {showFlyout && (
          <SettingsFlyout
            connectorId={connectorId}
            defaultSelectedTabId={defaultSelectedTabId}
            end={end}
            filters={filters}
            onClose={onClose}
            onConnectorIdSelected={onConnectorIdSelected}
            onGenerate={onGenerate}
            query={query}
            setEnd={setEnd}
            setFilters={setFilters}
            setQuery={setQuery}
            setStart={setStart}
            start={start}
            localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
            setLocalStorageAttackDiscoveryMaxAlerts={setLocalStorageAttackDiscoveryMaxAlerts}
          />
        )}

        <SpyRoute pageName={SecurityPageName.attackDiscovery} />
      </div>
    </div>
  );
};

AttackDiscoveryPageComponent.displayName = 'AttackDiscoveryPage';

export const AttackDiscoveryPage = React.memo(AttackDiscoveryPageComponent);
