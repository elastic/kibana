/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  AvailablePackagesHookType,
  IntegrationCardItem,
  UseLocalSearchType,
} from '@kbn/fleet-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';

type UseGetSettingsQueryType = typeof import('@kbn/fleet-plugin/public')['useGetSettingsQuery'];

interface FleetHooks {
  useAvailablePackages: AvailablePackagesHookType;
  useLocalSearch: UseLocalSearchType;
  useGetSettingsQuery: UseGetSettingsQueryType;
}

const fetchFleetHooks = (): Promise<FleetHooks> =>
  import('@kbn/fleet-plugin/public').then((module) =>
    Promise.all([module.AvailablePackagesHook(), module.LocalSearchHook()]).then(
      ([availablePackages, localSearch]) => ({
        useAvailablePackages: availablePackages.useAvailablePackages,
        useLocalSearch: localSearch.useLocalSearch,
        useGetSettingsQuery: module.useGetSettingsQuery,
      })
    )
  );

interface PackagesSnapshot {
  allCards: IntegrationCardItem[];
  isLoading: boolean;
  error?: Error;
}

export interface FleetCardsValue extends PackagesSnapshot {
  /** Fleet's card list with collection cards applied, empty until loaded. */
  allCards: IntegrationCardItem[];
  retry: () => void;
  /** Fleet's search-index hook, null until the module has loaded. */
  useLocalSearch: UseLocalSearchType | null;
}

const EMPTY_CARDS: IntegrationCardItem[] = [];

const FleetCardsContext = createContext<FleetCardsValue>({
  allCards: EMPTY_CARDS,
  isLoading: true,
  retry: () => {},
  useLocalSearch: null,
});

export const useFleetCards = (): FleetCardsValue => useContext(FleetCardsContext);

/**
 * Publishes Fleet's package query up to the provider. Renderless and memoized so
 * the update it causes cannot re-render it: Fleet rebuilds `allCards` every render.
 */
const PackagesPump = memo(
  ({
    fleetHooks,
    canReadSettings,
    prereleaseQueryParam,
    onSnapshot,
  }: {
    fleetHooks: FleetHooks;
    canReadSettings: boolean;
    prereleaseQueryParam: boolean;
    onSnapshot: (snapshot: PackagesSnapshot) => void;
  }) => {
    const { data: settings } = fleetHooks.useGetSettingsQuery({ enabled: canReadSettings });
    const prereleaseIntegrationsEnabled =
      prereleaseQueryParam || (settings?.item.prerelease_integrations_enabled ?? false);

    // `allCards`, not `filteredCards`: the latter is pre-filtered by Fleet's own
    // router-derived category state, which is wrong outside the onboarding route.
    const { allCards, isLoading, eprPackageLoadingError } = fleetHooks.useAvailablePackages({
      prereleaseIntegrationsEnabled,
      enableCollectionGrouping: true,
    });

    useEffect(() => {
      onSnapshot({ allCards, isLoading, error: eprPackageLoadingError ?? undefined });
    }, [allCards, isLoading, eprPackageLoadingError, onSnapshot]);

    return null;
  }
);

/**
 * Loads Fleet's package data once for the whole Add Data page. Only the renderless
 * pump comes and goes when the async module lands; swapping the wrapper around
 * `children` would remount the grid and the results under it.
 */
export const FleetCardsProvider = ({ children }: { children: React.ReactNode }) => {
  const hooksRef = useRef<FleetHooks | null>(null);
  const [packages, setPackages] = useState<PackagesSnapshot | null>(null);
  const { search } = useLocation();
  const {
    services: { fleet },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const prereleaseQueryParam = new URLSearchParams(search).get('prerelease') === 'true';
  const canReadSettings = fleet?.authz.fleet.readSettings ?? false;

  const {
    error: errorLoading,
    retry: retryAsyncLoad,
    loading: asyncLoading,
  } = useAsyncRetry(async () => {
    hooksRef.current = await fetchFleetHooks();
  }, []);

  const retry = useCallback(() => {
    if (asyncLoading) return;
    // The pump unmounts while the module reloads, so drop what it published
    // rather than show a stale failure on the way back.
    setPackages(null);
    retryAsyncLoad();
  }, [asyncLoading, retryAsyncLoad]);

  const fleetHooks = !asyncLoading ? hooksRef.current : null;
  // `useAsyncRetry` keeps the previous error while retrying, so loading wins.
  const moduleError = errorLoading && !asyncLoading ? errorLoading : undefined;

  const value = useMemo<FleetCardsValue>(
    () => ({
      allCards: packages?.allCards ?? EMPTY_CARDS,
      // No snapshot yet means the pump has not reported, so loading unless the
      // module failed.
      isLoading: packages ? packages.isLoading : !moduleError,
      error: packages?.error ?? moduleError,
      retry,
      useLocalSearch: fleetHooks?.useLocalSearch ?? null,
    }),
    [packages, moduleError, retry, fleetHooks]
  );

  return (
    <FleetCardsContext.Provider value={value}>
      {fleetHooks && (
        <PackagesPump
          fleetHooks={fleetHooks}
          canReadSettings={canReadSettings}
          prereleaseQueryParam={prereleaseQueryParam}
          onSnapshot={setPackages}
        />
      )}
      {children}
    </FleetCardsContext.Provider>
  );
};
