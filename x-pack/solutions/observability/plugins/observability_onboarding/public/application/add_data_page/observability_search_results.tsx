/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import type { AvailablePackagesHookType, UseLocalSearchType } from '@kbn/fleet-plugin/public';
import { AddDataSearchResults } from '../add_data_grid';
import type { CollectionCardItem } from './collection_card';
import { createRenderResultCard } from './render_result_card';
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
  /** Opens the collection chooser flyout, which the page hosts. */
  onOpenCollection: (card: CollectionCardItem) => void;
}

type RenderCard = ReturnType<typeof createRenderResultCard>;

const LoadedResults = ({
  searchTerm,
  fleetHooks,
  onRetry,
  renderCard,
}: {
  searchTerm: string;
  fleetHooks: FleetHooks;
  onRetry: () => void;
  renderCard: RenderCard;
}) => {
  const { items, isLoading, error } = useAddDataResultItems({ searchTerm, ...fleetHooks });

  return (
    <AddDataSearchResults
      searchTerm={searchTerm}
      items={items}
      isLoading={isLoading}
      isError={Boolean(error)}
      onRetry={onRetry}
      renderCard={renderCard}
    />
  );
};

export const ObservabilitySearchResults = ({ searchTerm, onOpenCollection }: Props) => {
  const hookRef = useRef<FleetHooks | null>(null);
  const renderCard = useMemo(
    () => createRenderResultCard({ onOpenCollection }),
    [onOpenCollection]
  );

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
        renderCard={renderCard}
      />
    );
  }

  if (asyncLoading || hookRef.current === null) {
    return (
      <AddDataSearchResults searchTerm={searchTerm} items={[]} isLoading renderCard={renderCard} />
    );
  }

  return (
    <LoadedResults
      searchTerm={searchTerm}
      fleetHooks={hookRef.current}
      onRetry={retry}
      renderCard={renderCard}
    />
  );
};
