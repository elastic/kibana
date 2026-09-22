/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import type { AvailablePackagesHookType, UseLocalSearchType } from '@kbn/fleet-plugin/public';
import { AddDataSearchResults } from '../add_data_grid';
import { renderResultCard } from './render_result_card';
import { useAddDataResultItems } from './use_add_data_result_items';

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

interface Props {
  searchTerm: string;
}

const LoadedResults = ({
  searchTerm,
  fleetHooks,
  onRetry,
}: Props & { fleetHooks: FleetHooks; onRetry: () => void }) => {
  const { items, isLoading, error } = useAddDataResultItems({ searchTerm, ...fleetHooks });

  return (
    <AddDataSearchResults
      searchTerm={searchTerm}
      items={items}
      isLoading={isLoading}
      // The error state wins over partial quickstart-only results.
      isError={Boolean(error)}
      onRetry={onRetry}
      renderCard={renderResultCard}
    />
  );
};

export const ObservabilitySearchResults = ({ searchTerm }: Props) => {
  const hookRef = useRef<FleetHooks | null>(null);

  const {
    error: errorLoading,
    retry: retryAsyncLoad,
    loading: asyncLoading,
  } = useAsyncRetry(async () => {
    hookRef.current = await fetchFleetHooks();
  });

  const retry = () => {
    if (!asyncLoading) retryAsyncLoad();
  };

  // `useAsyncRetry` keeps the previous error while retrying, so loading has to
  // be checked first or Retry leaves an enabled button that does nothing.
  if (errorLoading && !asyncLoading) {
    return (
      <AddDataSearchResults
        searchTerm={searchTerm}
        items={[]}
        isLoading={false}
        isError
        onRetry={retry}
        renderCard={renderResultCard}
      />
    );
  }

  if (asyncLoading || hookRef.current === null) {
    return (
      <AddDataSearchResults
        searchTerm={searchTerm}
        items={[]}
        isLoading
        renderCard={renderResultCard}
      />
    );
  }

  return <LoadedResults searchTerm={searchTerm} fleetHooks={hookRef.current} onRetry={retry} />;
};
