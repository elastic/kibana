/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { PND_FEATURE_ID } from '@kbn/pnd-common';

/**
 * The three services PND's data hooks reach for. Hand-rolled rather than taken
 * from `@kbn/core-*-browser-mocks`, because adding a package to `pnd/tsconfig.json`
 * is outside this bead's file territory.
 */
export interface PndTestHttp {
  /** Only `prepend`, which `@kbn/unsaved-changes-prompt` calls to build the URL it leaves for. */
  basePath: { prepend: jest.Mock };
  get: jest.Mock;
  patch: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
}

export interface PndTestToasts {
  addDanger: jest.Mock;
  addInfo: jest.Mock;
  addSuccess: jest.Mock;
  addWarning: jest.Mock;
}

export interface PndTestServices {
  application: {
    capabilities: Record<string, Record<string, boolean>>;
    getUrlForApp: jest.Mock;
    navigateToApp: jest.Mock;
    navigateToUrl: jest.Mock;
  };
  http: PndTestHttp;
  notifications: { toasts: PndTestToasts };
  /** `openConfirm` only, which the unsaved-changes prompt raises to block navigation. */
  overlays: { openConfirm: jest.Mock };
}

interface CreatePndTestServicesParams {
  /** `capabilities.pnd.*`; defaults to the read-only analyst (no `manageAutonomy`). */
  pndCapabilities?: Record<string, boolean>;
}

export const createPndTestServices = ({
  pndCapabilities = {},
}: CreatePndTestServicesParams = {}): PndTestServices => ({
  application: {
    capabilities: { [PND_FEATURE_ID]: pndCapabilities },
    getUrlForApp: jest.fn(),
    navigateToApp: jest.fn(),
    navigateToUrl: jest.fn(),
  },
  http: {
    basePath: { prepend: jest.fn((path: string) => path) },
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
  notifications: {
    toasts: {
      addDanger: jest.fn(),
      addInfo: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
    },
  },
  // Resolves false — "keep editing" — so a test that does not opt in never navigates away.
  overlays: { openConfirm: jest.fn().mockResolvedValue(false) },
});

/**
 * A query client with logging silenced and **no retry backoff**, so a test that
 * exercises a failure path resolves in a few ticks.
 *
 * `retryDelay: 0` rather than `retry: false`, because PND's hooks pass their own
 * `retry: retryOnTransientError` — which a client default cannot override. The
 * retry *count* therefore stays faithful (a 503 really is attempted four times
 * before "Workflows unavailable" paints); only the waiting is removed.
 */
export const createPndTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false, retryDelay: 0 },
      queries: { retry: false, retryDelay: 0 },
    },
    logger: { error: () => {}, log: () => {}, warn: () => {} },
  });

interface RenderWithPndProvidersOptions {
  queryClient?: QueryClient;
  services?: PndTestServices;
}

export interface RenderWithPndProvidersResult extends RenderResult {
  queryClient: QueryClient;
  services: PndTestServices;
}

/**
 * Mirrors `application.tsx`'s provider stack (react-query → i18n → Kibana services) so a
 * component under test sees the same context it does in the app.
 *
 * `Router` is deliberately NOT included: only some surfaces need it, and the
 * ones that do choose their own initial entries.
 */
export const renderWithPndProviders = (
  ui: React.ReactElement,
  {
    queryClient = createPndTestQueryClient(),
    services = createPndTestServices(),
  }: RenderWithPndProvidersOptions = {}
): RenderWithPndProvidersResult => {
  const result = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <KibanaContextProvider services={services}>{ui}</KibanaContextProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  return { ...result, queryClient, services };
};

/**
 * The hook-testing counterpart: a `wrapper` for `renderHook`.
 */
export const createPndProvidersWrapper = ({
  queryClient = createPndTestQueryClient(),
  services = createPndTestServices(),
}: RenderWithPndProvidersOptions = {}): React.FC<{ children: React.ReactNode }> => {
  return function PndProvidersWrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
        </I18nProvider>
      </QueryClientProvider>
    );
  };
};
