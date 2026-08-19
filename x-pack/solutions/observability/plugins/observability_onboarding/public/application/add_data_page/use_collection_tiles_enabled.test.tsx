/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react';
import React from 'react';
import type { ObservabilityOnboardingAppServices } from '../..';
import { useCollectionTilesEnabled } from './use_collection_tiles_enabled';

const FLAG = 'enableIntegrationCollectionTiles';

const renderWithConfig = (config?: {
  enableExperimental?: string[];
  experimentalFeatures?: Record<string, boolean>;
}) => {
  const fleet = config
    ? ({ config } as unknown as NonNullable<ObservabilityOnboardingAppServices['fleet']>)
    : undefined;
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={{ fleet }}>{children}</KibanaContextProvider>
  );
  return renderHook(() => useCollectionTilesEnabled(), { wrapper: Wrapper }).result.current;
};

describe('useCollectionTilesEnabled', () => {
  it('reads the deprecated array form', () => {
    expect(renderWithConfig({ enableExperimental: [FLAG] })).toBe(true);
  });

  it('reads the object form', () => {
    expect(renderWithConfig({ experimentalFeatures: { [FLAG]: true } })).toBe(true);
  });

  // Fleet resolves the same conflict the same way, and the object form is the only
  // one of the two that a running Kibana can change.
  it('lets the object form override the array form', () => {
    expect(
      renderWithConfig({
        enableExperimental: [FLAG],
        experimentalFeatures: { [FLAG]: false },
      })
    ).toBe(false);
  });

  it('is off without a Fleet service', () => {
    expect(renderWithConfig()).toBe(false);
  });

  it('is off when Fleet sets neither key', () => {
    expect(renderWithConfig({})).toBe(false);
  });
});
