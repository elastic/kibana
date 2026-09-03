/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import type { MemoryHistory } from 'history';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';

/**
 * The single shared render wrapper for `pnd/public` unit tests.
 *
 * Before this existed every PND test file rolled its own wrapper (three
 * variants, two of them with no providers at all), which is why EUI theme and
 * router-dependent components could only be tested by accident. It mirrors the
 * provider stack `application.tsx` mounts — theme, react-query, i18n, Kibana
 * services, router — so a component that renders here renders in the app.
 *
 * Reuse it rather than adding a fourth variant.
 */
export interface PndTestProvidersOptions {
  /**
   * The router's history. Defaults to a fresh in-memory one at `route`, which is what most tests
   * want; pass your own when the same object also has to reach `services` — the unsaved-changes
   * prompt blocks navigation through the history it is handed, so it has to be the router's.
   */
  history?: MemoryHistory;
  /** Initial router entry, for components that read the location or push to it. Ignored with `history`. */
  route?: string;
  /**
   * Services exposed through `useKibana()`, e.g.
   * `{ http: httpServiceMock.createStartContract() }`. Only what the component
   * under test reads needs to be present.
   */
  services?: Record<string, unknown>;
}

export interface PndTestProviders {
  /** The wrapper component, for `render(..., { wrapper })` and `renderHook`. */
  Providers: React.FC<PropsWithChildren>;
  /** The in-memory history the router was given, so tests can assert navigation. */
  history: MemoryHistory;
}

/**
 * A `QueryClient` with retries disabled: a test that provokes a rejected query
 * should see the error state on the first render rather than after three
 * exponential-backoff attempts.
 */
const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

/**
 * Builds the provider stack without rendering, for `renderHook` and for tests
 * that need the `history` before the first render.
 */
export const createPndTestProviders = ({
  history = undefined,
  route = '/',
  services = {},
}: PndTestProvidersOptions = {}): PndTestProviders => {
  const routerHistory = history ?? createMemoryHistory({ initialEntries: [route] });
  const queryClient = createTestQueryClient();

  const Providers: React.FC<PropsWithChildren> = ({ children }) => (
    // `globalStyles`/`utilityClasses` off: jsdom does not paint, and injecting
    // the full EUI global stylesheet into every test is pure overhead.
    <EuiProvider globalStyles={false} utilityClasses={false}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <KibanaContextProvider services={services}>
            <Router history={routerHistory}>{children}</Router>
          </KibanaContextProvider>
        </I18nProvider>
      </QueryClientProvider>
    </EuiProvider>
  );

  return { Providers, history: routerHistory };
};

export interface RenderWithPndProvidersResult extends RenderResult {
  /** The in-memory history the router was given, so tests can assert navigation. */
  history: MemoryHistory;
}

/**
 * Renders `ui` inside the PND provider stack. Returns everything React Testing
 * Library returns, plus the `history` the router was given.
 */
export const renderWithPndProviders = (
  ui: ReactElement,
  {
    renderOptions,
    ...providerOptions
  }: PndTestProvidersOptions & { renderOptions?: RenderOptions } = {}
): RenderWithPndProvidersResult => {
  const { Providers, history } = createPndTestProviders(providerOptions);

  return { ...render(ui, { ...renderOptions, wrapper: Providers }), history };
};
