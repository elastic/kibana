/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import {
  useObservabilityCuratedCategories,
  useObservabilityMiniTiles,
} from './observability_flavor';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <KibanaContextProvider services={coreMock.createStart()}>
      <MemoryRouter initialEntries={['/']}>
        <CompatRouter>{children}</CompatRouter>
      </MemoryRouter>
    </KibanaContextProvider>
  </I18nProvider>
);

describe('useObservabilityCuratedCategories', () => {
  it('builds the four curated categories', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), { wrapper });
    expect(result.current.map((category) => category.id)).toEqual([
      'cloud',
      'containers',
      'host',
      'applications',
    ]);
  });

  it('wires router navigation for tiles with a route and none for tiles without', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), { wrapper });
    const tiles = result.current.flatMap((category) => category.tiles);
    const kubernetes = tiles.find((tile) => tile.id === 'kubernetes');
    const aws = tiles.find((tile) => tile.id === 'aws');
    expect(kubernetes?.href).toBe('/kubernetes');
    expect(kubernetes?.onClick).toBeDefined();
    expect(aws?.href).toBeUndefined();
    expect(aws?.onClick).toBeUndefined();
  });

  it('preserves the existing data-test-subj values', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), { wrapper });
    const linux = result.current
      .flatMap((category) => category.tiles)
      .find((tile) => tile.id === 'linux');
    expect(linux?.['data-test-subj']).toBe('observabilityOnboardingIntegrationTile-linux');
  });
});

describe('useObservabilityMiniTiles', () => {
  it('builds the mini tiles with preserved data-test-subj values and a noop click', () => {
    const { result } = renderHook(() => useObservabilityMiniTiles(), { wrapper });
    expect(result.current.map((tile) => tile.id)).toEqual([
      'confluence',
      'salesforce',
      'slack',
      'splunk',
      'jira',
    ]);
    expect(result.current[0]['data-test-subj']).toBe(
      'observabilityOnboardingIntegrationMiniTile-confluence'
    );
    expect(result.current[0].onClick).toBeDefined();
  });
});
