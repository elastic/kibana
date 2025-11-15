/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiSpacer, EuiTablePagination } from '@elastic/eui';
import type { AIConnector } from '@kbn/elastic-assistant';
import {
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  HISTORY_QUERY_LOCAL_STORAGE_KEY,
  useAssistantContext,
} from '@kbn/elastic-assistant';
import type { AttackDiscoveryAlert, Replacements } from '@kbn/elastic-assistant-common';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { getEsQueryConfig } from '@kbn/data-service';
import { DataViewManagerScopeName } from '../../../../data_view_manager/constants';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { useKibana } from '../../../../common/lib/kibana';
import { combineQueries } from '../../../../common/lib/kuery';
import { buildTimeRangeFilter } from '../../../../detections/components/alerts_table/helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { SearchBarSection } from '../../../../detections/components/alerts/search_bar/search_bar_section';
import { useAttackDiscoveryHistoryTimerange } from '../../use_attack_discovery_history_timerange';
import { AttackDiscoveryPanel } from '../attack_discovery_panel';
import { EmptyPrompt } from '../empty_states/empty_prompt';
import { getInitialSelection } from './get_initial_selection';
import { Generations } from './generations';
import { getInitialIsOpen } from '../../helpers';
import { SearchAndFilter } from './search_and_filter';
import { ACKNOWLEDGED, CLOSED, OPEN } from './search_and_filter/translations';
import { Summary } from '../summary';
import * as i18n from './translations';
import type { SettingsOverrideOptions } from './types';
import { useDismissAttackDiscoveryGeneration } from '../../use_dismiss_attack_discovery_generations';
import { useIdsFromUrl } from './use_ids_from_url';
import { useFindAttackDiscoveries } from '../../use_find_attack_discoveries';
import { useGetAttackDiscoveryGenerations } from '../../use_get_attack_discovery_generations';

const DEFAULT_PER_PAGE = 10;
const GET_ATTACK_DISCOVERY_GENERATIONS_SIZE = 50; // fetch up to 50 generations, with no filter by status
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const EMPTY_ATTACK_DISCOVERY_ALERTS: AttackDiscoveryAlert[] = [];

const FIRST_PAGE = 1; // CAUTION: sever-side API uses a 1-based page index convention (for consistency with similar existing APIs)

const EMPTY_REPLACEMENTS: Replacements = {};
const EMPTY_QUERY = '';

interface Props {
  aiConnectors: AIConnector[] | undefined;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
  onToggleShowAnonymized: () => void;
  showAnonymized: boolean;
}

const HistoryComponent: React.FC<Props> = ({
  aiConnectors,
  localStorageAttackDiscoveryMaxAlerts,
  onGenerate,
  onToggleShowAnonymized,
  showAnonymized,
}) => {
  const { uiSettings } = useKibana().services;

  const { assistantAvailability, http } = useAssistantContext();

  const { ids: filterByAlertIds, setIdsUrl: setFilterByAlertIds } = useIdsFromUrl();
  const { historyStart, setHistoryStart, historyEnd, setHistoryEnd } =
    useAttackDiscoveryHistoryTimerange();

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  const { to: globalTo, from: globalFrom } = useGlobalTime();

  const { dataView } = useDataView(SourcererScopeName.detections);
  const dataViewSpec = useMemo(() => dataView.toSpec(), [dataView]);
  const browserFields = useBrowserFields(DataViewManagerScopeName.detections, dataView);

  // search bar query:
  const [query, setQuery] = useLocalStorage<string>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${HISTORY_QUERY_LOCAL_STORAGE_KEY}`,
    EMPTY_QUERY
  );

  /**
   * `undefined`: show both shared, and only visible to me Attack discoveries. `true`: show only shared Attack discoveries. `false`: show only visible to me Attack discoveries.
   */
  const [shared, setShared] = useState<boolean | undefined>(undefined);

  const [page, setPage] = React.useState(FIRST_PAGE); // one-based, per API convention
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const onChangePage = useCallback((zeroBasedPageIndex: number) => {
    const oneBasedPageIndex = zeroBasedPageIndex + 1; // convert to one-based for API

    setPage(oneBasedPageIndex);
    setSelectedAttackDiscoveries({});
  }, []);

  const setIsSelected = useCallback(
    ({ id, selected }: { id: string; selected: boolean }): void =>
      setSelectedAttackDiscoveries((prevSelected) => ({
        ...prevSelected,
        [id]: selected,
      })),
    []
  );

  const onChangeItemsPerPage = useCallback((pageSize: number) => {
    setPage(FIRST_PAGE);
    setPerPage(pageSize); // convert to zero-based for pagination component
    setSelectedAttackDiscoveries({});
  }, []);

  const [statusItems, setStatusItems] = useState<EuiSelectableOption[]>([
    { checked: 'on', 'data-test-subj': 'open', label: OPEN },
    { checked: 'on', 'data-test-subj': 'acknowledged', label: ACKNOWLEDGED },
    { checked: undefined, 'data-test-subj': 'closed', label: CLOSED },
  ]);

  const selectedAlertWorkflowStatus: string[] = useMemo(() => {
    return statusItems
      .filter((item) => item.checked === 'on')
      .map((item) => item.label.toLowerCase());
  }, [statusItems]);

  const [selectedConnectorNames, setSelectedConnectorNames] = useState<string[]>([]);

  const timeRangeFilter = useMemo(
    () => buildTimeRangeFilter(globalFrom, globalTo),
    [globalFrom, globalTo]
  );
  const filters = useMemo(
    () => [...globalFilters, ...timeRangeFilter],
    [globalFilters, timeRangeFilter]
  );

  const newQuery = useMemo(() => {
    const combinedQuery = combineQueries({
      config: getEsQueryConfig(uiSettings),
      dataProviders: [],
      dataViewSpec,
      dataView,
      browserFields,
      filters,
      kqlQuery: globalQuery,
      kqlMode: globalQuery.language,
    });

    if (combinedQuery?.kqlError || !combinedQuery?.filterQuery) {
      return { bool: {} };
    }

    try {
      const filter = JSON.parse(combinedQuery?.filterQuery);
      return { bool: { filter } };
    } catch {
      return { bool: {} };
    }
  }, [browserFields, dataView, dataViewSpec, filters, globalQuery, uiSettings]);

  console.log(`[TEST] newQuery: ${JSON.stringify(newQuery)}`);

  const {
    cancelRequest: cancelFindAttackDiscoveriesRequest,
    data,
    isLoading,
    refetch: refetchFindAttackDiscoveries,
  } = useFindAttackDiscoveries({
    connectorNames: selectedConnectorNames,
    end: globalTo,
    ids: filterByAlertIds.length > 0 ? filterByAlertIds : undefined,
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    page,
    perPage,
    search: query?.trim(),
    shared,
    start: globalFrom,
    status: selectedAlertWorkflowStatus,
    globalQuery: JSON.stringify(newQuery),
  });

  const {
    cancelRequest: cancelGetAttackDiscoveryGenerations,
    data: generationsData,
    refetch: refetchGenerations,
  } = useGetAttackDiscoveryGenerations({
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    size: GET_ATTACK_DISCOVERY_GENERATIONS_SIZE,
  });

  const connectorNames = useMemo(() => data?.connector_names ?? [], [data]);

  const [selectedAttackDiscoveries, setSelectedAttackDiscoveries] = useState<
    Record<string, boolean>
  >(getInitialSelection(data?.data ?? EMPTY_ATTACK_DISCOVERY_ALERTS));

  useEffect(() => {
    const intervalId = setInterval(() => {
      refetchGenerations();
    }, 10_000); // 10 seconds

    return () => {
      clearInterval(intervalId);
      cancelGetAttackDiscoveryGenerations();
      cancelFindAttackDiscoveriesRequest();
    };
  }, [cancelFindAttackDiscoveriesRequest, cancelGetAttackDiscoveryGenerations, refetchGenerations]);

  const pageCount = useMemo(() => Math.ceil((data?.total ?? 0) / perPage), [data, perPage]);

  const { mutateAsync: dismissAttackDiscoveryGeneration } = useDismissAttackDiscoveryGeneration();
  const onRefresh = useCallback(async () => {
    refetchFindAttackDiscoveries();

    // Dismiss all successful generations
    // TODO: make this a bulk update:
    if (generationsData?.generations) {
      const dismissPromises = generationsData.generations
        .filter(({ status }) => status === 'succeeded')
        .map(({ execution_uuid: executionUuid }) =>
          dismissAttackDiscoveryGeneration({ executionUuid })
        );

      await Promise.all(dismissPromises);
    }

    setSelectedAttackDiscoveries({});
  }, [
    dismissAttackDiscoveryGeneration,
    generationsData?.generations,
    refetchFindAttackDiscoveries,
  ]);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { sourcererDataView: oldSourcererDataViewSpec, loading: oldSourcererDataViewIsLoading } =
    useSourcererDataView(SourcererScopeName.detections);
  // TODO rename to just dataView and status once we remove the newDataViewPickerEnabled feature flag
  const { dataView: experimentalDataView, status: experimentalDataViewStatus } = useDataView(
    SourcererScopeName.detections
  );
  const isDataViewLoading: boolean = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataViewStatus === 'loading' || experimentalDataViewStatus === 'pristine'
        : oldSourcererDataViewIsLoading,
    [experimentalDataViewStatus, newDataViewPickerEnabled, oldSourcererDataViewIsLoading]
  );

  return (
    <div data-test-subj="history">
      {!isDataViewLoading && (
        <SearchBarSection
          dataView={newDataViewPickerEnabled ? experimentalDataView : oldSourcererDataViewSpec}
        />
      )}

      <EuiSpacer size="m" />

      <SearchAndFilter
        aiConnectors={aiConnectors}
        connectorNames={connectorNames}
        end={historyEnd}
        filterByAlertIds={filterByAlertIds}
        isLoading={isLoading}
        onRefresh={onRefresh}
        query={query}
        setEnd={setHistoryEnd}
        setFilterByAlertIds={setFilterByAlertIds}
        selectedConnectorNames={selectedConnectorNames}
        setQuery={setQuery}
        setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
        setSelectedConnectorNames={setSelectedConnectorNames}
        setShared={setShared}
        setStart={setHistoryStart}
        setStatusItems={setStatusItems}
        statusItems={statusItems}
        shared={shared}
        start={historyStart}
      />

      <EuiSpacer size="m" />

      <Summary
        alertsCount={data?.unique_alert_ids_count ?? 0}
        attackDiscoveriesCount={data?.total ?? 0}
        isLoading={isLoading}
        lastUpdated={null}
        onToggleShowAnonymized={onToggleShowAnonymized}
        refetchFindAttackDiscoveries={refetchFindAttackDiscoveries}
        selectedAttackDiscoveries={selectedAttackDiscoveries}
        selectedConnectorAttackDiscoveries={data?.data ?? EMPTY_ATTACK_DISCOVERY_ALERTS}
        setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
        showAnonymized={showAnonymized}
      />

      <EuiSpacer size="m" />

      <Generations
        aiConnectors={aiConnectors}
        data={generationsData}
        refetchGenerations={refetchGenerations}
        localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
      />

      <EuiSpacer size="m" />

      {data != null && data.data.length === 0 && (
        <EmptyPrompt
          aiConnectorsCount={aiConnectors?.length ?? null}
          attackDiscoveriesCount={data?.total ?? 0}
          isDisabled={!aiConnectors?.length}
          isLoading={isLoading}
          onGenerate={onGenerate}
        />
      )}

      {data != null && data.data.length > 0 && (
        <>
          {data.data.map((attackDiscovery, i) => (
            <React.Fragment key={attackDiscovery.id}>
              <AttackDiscoveryPanel
                attackDiscovery={attackDiscovery}
                initialIsOpen={getInitialIsOpen(i)}
                replacements={attackDiscovery.replacements ?? EMPTY_REPLACEMENTS}
                setIsSelected={setIsSelected}
                isSelected={selectedAttackDiscoveries[attackDiscovery.id]}
                setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
                showAnonymized={showAnonymized}
              />
              <EuiSpacer size="m" />
            </React.Fragment>
          ))}

          <EuiSpacer size="l" />

          <EuiTablePagination
            activePage={page - 1} // convert to zero-based for EUI
            aria-label={i18n.PAGINATION_ARIA_LABEL}
            data-test-subj="pagination"
            itemsPerPage={perPage}
            itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
            pageCount={pageCount}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onChangePage={onChangePage}
          />
        </>
      )}
    </div>
  );
};

export const History = React.memo(HistoryComponent);
