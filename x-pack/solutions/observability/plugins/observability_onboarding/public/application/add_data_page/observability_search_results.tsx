/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { IntegrationCardItem, UseLocalSearchType } from '@kbn/fleet-plugin/public';
import { AddDataSearchResults } from '../add_data_grid';
import type { FleetCardsValue } from './fleet_cards_provider';
import { useFleetCards } from './fleet_cards_provider';
import { createRenderResultCard } from './render_result_card';
import { useAddDataResultItems } from './use_add_data_result_items';

interface Props {
  searchTerm: string;
  /** Names the chooser the page should open, by Fleet's group id. */
  onOpenCollection: (groupId: string) => void;
}

type RenderCard = ReturnType<typeof createRenderResultCard>;

const LoadedResults = ({
  searchTerm,
  allCards,
  isLoading,
  error,
  useLocalSearch,
  onRetry,
  renderCard,
}: {
  searchTerm: string;
  allCards: IntegrationCardItem[];
  isLoading: boolean;
  error?: Error;
  useLocalSearch: UseLocalSearchType;
  onRetry: () => void;
  renderCard: RenderCard;
}) => {
  const { items } = useAddDataResultItems({ searchTerm, allCards, isLoading, useLocalSearch });

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

/**
 * The search results half of the Add Data page, reading the package data the
 * page-level FleetCardsProvider already shares with the curated grid.
 */
export const ObservabilitySearchResults = ({ searchTerm, onOpenCollection }: Props) => {
  const fleetCards: FleetCardsValue = useFleetCards();
  const renderCard = useMemo(
    () => createRenderResultCard({ onOpenCollection }),
    [onOpenCollection]
  );

  const { useLocalSearch, allCards, isLoading, error, retry } = fleetCards;

  // `useLocalSearch` doubles as the module-loaded signal: no hook to call yet.
  if (useLocalSearch === null) {
    return (
      <AddDataSearchResults
        searchTerm={searchTerm}
        items={[]}
        isLoading={isLoading}
        isError={Boolean(error)}
        onRetry={retry}
        renderCard={renderCard}
      />
    );
  }

  return (
    <LoadedResults
      searchTerm={searchTerm}
      allCards={allCards}
      isLoading={isLoading}
      error={error}
      useLocalSearch={useLocalSearch}
      onRetry={retry}
      renderCard={renderCard}
    />
  );
};
