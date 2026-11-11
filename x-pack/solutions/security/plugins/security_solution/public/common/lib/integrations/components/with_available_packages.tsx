/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import type { AvailablePackagesHookType } from '@kbn/fleet-plugin/public';
import { withLazyHook } from '../../../components/with_lazy_hook';
import { excludeContentCards } from '../../../utils/integrations';
import { LOADING_SKELETON_TEXT_LINES } from '../constants';

export type AvailablePackages = ReturnType<AvailablePackagesHookType>;

export interface WithAvailablePackagesProps {
  prereleaseIntegrationsEnabled?: boolean;
}

/**
 * HOC to wrap a component with the `availablePackages` from Fleet.
 */
export const withAvailablePackages = <T extends { availablePackages: AvailablePackages }>(
  Component: React.ComponentType<T>
): React.FC<Omit<T, 'availablePackages'> & WithAvailablePackagesProps> => {
  return withLazyHook(
    React.memo<WithAvailablePackagesProps & { useAvailablePackages: AvailablePackagesHookType }>(
      function WithAvailablePackages({
        useAvailablePackages,
        prereleaseIntegrationsEnabled = false,
        ...props
      }) {
        const availablePackages = useAvailablePackages({
          prereleaseIntegrationsEnabled,
          // Collection tiles are chosen via the chooser flyout of `PackageListGrid`
          // (see `collectionReturnLocation` in `SecurityIntegrationsGridTabs`).
          enableCollectionGrouping: true,
        });
        // Match the Fleet Integrations page, which hides content-only packages by default.
        // The hook returns a new object on every render, but its `filteredCards` is memoized: key on
        // the list only, so typing in the search box does not rebuild the cards and the grid's
        // search index. The rest of the object is spread fresh so no field goes stale.
        const filteredCards = useMemo(
          () => excludeContentCards(availablePackages.filteredCards),
          [availablePackages.filteredCards]
        );
        return (
          <Component
            {...({ ...props, availablePackages: { ...availablePackages, filteredCards } } as T)}
          />
        );
      }
    ),
    () => import('@kbn/fleet-plugin/public').then((module) => module.AvailablePackagesHook()),
    <EuiSkeletonText
      data-test-subj="loadingPackages"
      isLoading={true}
      lines={LOADING_SKELETON_TEXT_LINES}
    />
  );
};
