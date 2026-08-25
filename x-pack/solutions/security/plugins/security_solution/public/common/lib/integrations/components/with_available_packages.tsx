/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import type { AvailablePackagesHookType } from '@kbn/fleet-plugin/public';
import { withLazyHook } from '../../../components/with_lazy_hook';
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
        });
        return <Component {...({ ...props, availablePackages } as T)} />;
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
