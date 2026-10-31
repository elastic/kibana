/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ActionType } from '@kbn/actions-types';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';

export const actionType = (id: string, overrides: Partial<ActionType> = {}): ActionType => ({
  id,
  name: `Type ${id}`,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'enterprise',
  supportedFeatureIds: [],
  isSystemActionType: false,
  isDeprecated: false,
  ...overrides,
});

export const sandboxConnector = (
  id: string,
  overrides: Partial<SandboxConnector> = {}
): SandboxConnector => ({
  id,
  name: `Connector ${id}`,
  connector_type_id: '.http',
  is_preconfigured: false,
  ...overrides,
});

export const httpError = (status: number): Error =>
  Object.assign(new Error(status === 404 ? 'Not Found' : 'Forbidden'), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
  });

const registryModels: Record<
  string,
  { iconClass: string; actionTypeTitle: string; selectMessage: string }
> = {
  '.github': { iconClass: 'logoGithub', actionTypeTitle: 'GitHub', selectMessage: 'Repos' },
  '.http': { iconClass: 'globe', actionTypeTitle: 'HTTP', selectMessage: 'Send a request' },
};

/**
 * Mocks the Kibana services the sandbox connector components use. The test file must
 * `jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }))` first.
 *
 * The investigation agent's assigned connectors are kept in memory, so `addConnectorToAgent`
 * and `removeConnectorFromAgent` are reflected by the next `agents.get`.
 */
export function mockKibanaServices({
  types = [],
  connectors = [],
  assigned = [],
  capabilities = { show: true, save: true, delete: true, execute: true },
  canUpdateAgent = true,
  canManageAgents = true,
  withTriggersActionsUi = true,
  withOnboardingLocator = true,
}: {
  types?: ActionType[];
  connectors?: SandboxConnector[];
  /** Ids of the connectors assigned to the investigation agent */
  assigned?: string[];
  capabilities?: { show?: boolean; save?: boolean; delete?: boolean; execute?: boolean };
  canUpdateAgent?: boolean;
  canManageAgents?: boolean;
  withTriggersActionsUi?: boolean;
  /** Whether the Observability onboarding locator is registered */
  withOnboardingLocator?: boolean;
} = {}) {
  let assignedIds = [...assigned];
  const agent = () => ({
    configuration: { connector_ids: assignedIds },
    permissions: { update_agent: canUpdateAgent },
  });
  const agents = {
    get: jest.fn(async () => agent()),
    addConnectorToAgent: jest.fn(async ({ connectorId }: { connectorId: string }) => {
      assignedIds = [...assignedIds, connectorId];
      return agent();
    }),
    removeConnectorFromAgent: jest.fn(async ({ connectorId }: { connectorId: string }) => {
      assignedIds = assignedIds.filter((id) => id !== connectorId);
      return agent();
    }),
  };
  const fetchConnectorTypes = jest.fn().mockResolvedValue(types);
  const fetchConnectors = jest.fn().mockResolvedValue({ connectors });
  const fetch = jest.fn(async (endpoint: string) =>
    endpoint === 'GET /internal/nightshift/sandbox_connector_types'
      ? { connector_types: await fetchConnectorTypes() }
      : fetchConnectors()
  );
  const http = { delete: jest.fn().mockResolvedValue({}) };
  const toasts = { addSuccess: jest.fn(), addError: jest.fn() };
  const getAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyoutStub" />);
  const getEditConnectorFlyout = jest.fn(() => <div data-test-subj="editConnectorFlyoutStub" />);
  const navigateToUrl = jest.fn();
  const onboardingLocator = {
    getRedirectUrl: jest.fn(() => '/app/observabilityOnboarding?from=locator'),
  };

  (useKibana as jest.Mock).mockReturnValue({
    services: {
      http,
      agentBuilder: { agents },
      notifications: { toasts },
      application: {
        capabilities: { actions: capabilities, agentBuilder: { manageAgents: canManageAgents } },
        getUrlForApp: (app: string, options?: { path?: string }) =>
          `/app/${app}${options?.path ?? ''}`,
        navigateToUrl,
      },
      share: {
        url: {
          locators: {
            get: (id: string) =>
              withOnboardingLocator && id === 'OBSERVABILITY_ONBOARDING_LOCATOR'
                ? onboardingLocator
                : undefined,
          },
        },
      },
      nightshiftInvestigations: { investigationsClient: { fetch } },
      triggersActionsUi: withTriggersActionsUi
        ? {
            getAddConnectorFlyout,
            getEditConnectorFlyout,
            actionTypeRegistry: {
              has: (id: string) => id in registryModels,
              get: (id: string) => registryModels[id],
            },
          }
        : undefined,
    },
  });

  return {
    fetch,
    fetchConnectorTypes,
    fetchConnectors,
    agents,
    http,
    toasts,
    getAddConnectorFlyout,
    getEditConnectorFlyout,
    navigateToUrl,
    onboardingLocator,
  };
}

export function renderWithProviders(ui: React.ReactElement): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </I18nProvider>
  );
}

/** The `wrapper` for `renderHook` */
export function createHookWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
}
