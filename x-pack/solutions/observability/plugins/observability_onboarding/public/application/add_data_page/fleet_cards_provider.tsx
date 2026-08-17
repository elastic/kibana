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
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import type {
  AvailablePackagesHookType,
  IntegrationCardItem,
  UseLocalSearchType,
} from '@kbn/fleet-plugin/public';

interface FleetHooks {
  useAvailablePackages: AvailablePackagesHookType;
  useLocalSearch: UseLocalSearchType;
}

const fetchFleetHooks = (): Promise<FleetHooks> =>
  import('@kbn/fleet-plugin/public').then((module) =>
    Promise.all([module.AvailablePackagesHook(), module.LocalSearchHook()]).then(
      ([availablePackages, localSearch]) => ({
        useAvailablePackages: availablePackages.useAvailablePackages,
        useLocalSearch: localSearch.useLocalSearch,
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
 * Runs Fleet's package query and hands the result up to the provider. Rendering
 * nothing and memoizing keeps it out of the update it causes: Fleet rebuilds
 * `allCards` on every render, so a pump that re-rendered along with the
 * consumers it just refreshed would publish forever.
 */
const PackagesPump = memo(
  ({
    fleetHooks,
    onSnapshot,
  }: {
    fleetHooks: FleetHooks;
    onSnapshot: (snapshot: PackagesSnapshot) => void;
  }) => {
    // `allCards`, not `filteredCards`: the latter is pre-filtered by Fleet's own
    // router-derived category state, which is wrong outside the onboarding route.
    const { allCards, isLoading, eprPackageLoadingError } = fleetHooks.useAvailablePackages({
      prereleaseIntegrationsEnabled: true,
    });

    useEffect(() => {
      onSnapshot({ allCards, isLoading, error: eprPackageLoadingError ?? undefined });
    }, [allCards, isLoading, eprPackageLoadingError, onSnapshot]);

    return null;
  }
);

/**
 * Loads Fleet's package data once for the whole Add Data page, so the curated
 * grid (variant badges), the search results and the open chooser all read one
 * source. The module arrives async, so the tree above the children stays fixed
 * and only the renderless pump comes and goes: swapping the wrapper instead
 * would remount the grid and the results underneath it.
 */
export const FleetCardsProvider = ({ children }: { children: React.ReactNode }) => {
  const hooksRef = useRef<FleetHooks | null>(null);
  const [packages, setPackages] = useState<PackagesSnapshot | null>(null);

  const {
    error: errorLoading,
    retry: retryAsyncLoad,
    loading: asyncLoading,
  } = useAsyncRetry(async () => {
    hooksRef.current = await fetchFleetHooks();
  });

  const retry = useCallback(() => {
    if (asyncLoading) return;
    // The pump unmounts while the module reloads, so what it published goes
    // with it, or the failure it reported shows again on the way back.
    setPackages(null);
    retryAsyncLoad();
  }, [asyncLoading, retryAsyncLoad]);

  const fleetHooks = asyncLoading ? null : hooksRef.current;
  // `useAsyncRetry` keeps the previous error while retrying, so loading wins.
  const moduleError = errorLoading && !asyncLoading ? errorLoading : undefined;

  const value = useMemo<FleetCardsValue>(
    () => ({
      allCards: packages?.allCards ?? EMPTY_CARDS,
      // No snapshot yet means the pump is still on its way to its first one.
      isLoading: packages ? packages.isLoading : !moduleError,
      error: packages?.error ?? moduleError,
      retry,
      useLocalSearch: fleetHooks?.useLocalSearch ?? null,
    }),
    [packages, moduleError, retry, fleetHooks]
  );

  return (
    <FleetCardsContext.Provider value={value}>
      {fleetHooks && <PackagesPump fleetHooks={fleetHooks} onSnapshot={setPackages} />}
      {children}
    </FleetCardsContext.Provider>
  );
};
