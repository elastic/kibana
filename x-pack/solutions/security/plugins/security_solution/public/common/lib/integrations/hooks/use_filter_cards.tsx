/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailablePackagesHookType } from '@kbn/fleet-plugin/public';
import { useMemo } from 'react';

export const useFilterCards = ({
  useAvailablePackages,
  featuredCardIds,
  prereleaseIntegrationsEnabled,
}: {
  useAvailablePackages: AvailablePackagesHookType;
  featuredCardIds?: string[];
  prereleaseIntegrationsEnabled: boolean;
}) => {
  const {
    isLoading,
    searchTerm,
    setCategory,
    setSearchTerm,
    setSelectedSubCategory,
    filteredCards,
  } = useAvailablePackages({
    prereleaseIntegrationsEnabled,
  });

  return useMemo(
    () => ({
      availablePackagesResult: {
        isLoading,
        searchTerm,
        setCategory,
        setSearchTerm,
        setSelectedSubCategory,
      },
      allowedIntegrations: filteredCards.filter(
        (card) =>
          (featuredCardIds?.includes(card.name) || featuredCardIds?.includes(card.id)) ?? true
      ),
    }),
    [
      featuredCardIds,
      filteredCards,
      isLoading,
      searchTerm,
      setCategory,
      setSearchTerm,
      setSelectedSubCategory,
    ]
  );
};
