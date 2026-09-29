/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useLocation } from 'react-router-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { RuleTypeModalProps } from '@kbn/response-ops-rule-form/src/rule_type_modal/components/rule_type_modal';
import * as pluginContext from '../../hooks/use_plugin_context';
import type { ObservabilityPublicPluginsStart } from '../../plugin';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { RulesPage } from './rules';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
const mockObservabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();
const mockApplication = {
  navigateToApp: vi.fn(),
  navigateToUrl: vi.fn(),
};

const queryClient = new QueryClient();

vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useLocation: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: vi.fn(() => ({
    ...mockUseKibanaReturnValue,
    services: {
      ...mockUseKibanaReturnValue.services,
      observabilityAIAssistant: mockObservabilityAIAssistant,
      application: {
        ...mockUseKibanaReturnValue.services.application,
        navigateToApp: mockApplication.navigateToApp,
        navigateToUrl: mockApplication.navigateToUrl,
      },
    },
  })),
}));

vi.mock('../../hooks/use_get_available_rules_with_descriptions', () => {
  const mocked = {
    useGetAvailableRulesWithDescriptions: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/observability-shared-plugin/public');

vi.mock('@kbn/response-ops-rule-form/src/rule_type_modal', () => {
  const mocked = {
    RuleTypeModal: ({ onSelectRuleType }: RuleTypeModalProps) => (
      <div data-test-subj="ruleTypeModal">
        RuleTypeModal
        <button onClick={() => onSelectRuleType('1')}>Rule type 1</button>
      </div>
    ),
  };
  return { ...mocked, default: mocked };
});

const useLocationMock = useLocation as Mock;

vi.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {
    setHeaderActionMenu: () => {},
  } as unknown as AppMountParameters,
  config: {
    unsafe: {
      alertDetails: {
        apm: { enabled: false },
        uptime: { enabled: false },
        observability: { enabled: false },
      },
    },
    managedOtlpServiceUrl: '',
  },
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  kibanaFeatures: [],
  core: {} as CoreStart,
  plugins: {} as ObservabilityPublicPluginsStart,
}));

vi.mock('@kbn/alerts-ui-shared/src/common/hooks');
const { useGetRuleTypesPermissions } = await vi.importMock(
  '@kbn/alerts-ui-shared/src/common/hooks'
);

describe('RulesPage with all capabilities', () => {
  beforeEach(() => {
    useLocationMock.mockReturnValue({ pathname: '/rules', search: '', state: '', hash: '' });
  });

  async function setup() {
    useGetRuleTypesPermissions.mockReturnValue({
      authorizedToCreateAnyRules: true,
    });

    return render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <RulesPage />
        </QueryClientProvider>
      </IntlProvider>
    );
  }

  it('should render a page template', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('rulesPage')).toBeInTheDocument();
  });

  it('should render a RuleList ', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('rules-list')).toBeInTheDocument();
  });

  it('renders a create rule button which is not disabled', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('createRuleButton')).not.toBeDisabled();
  });

  it('navigates to create rule form correctly', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('createRuleButton')).toBeInTheDocument();

    fireEvent.click(wrapper.getByTestId('createRuleButton'));
    expect(await wrapper.findByTestId('ruleTypeModal')).toBeInTheDocument();

    fireEvent.click(await wrapper.findByText('Rule type 1'));
    await waitFor(() => {
      expect(mockApplication.navigateToApp).toHaveBeenCalledWith('rules', {
        path: '/create/1',
      });
    });
  });
});

describe('RulesPage with show only capability', () => {
  async function setup() {
    useGetRuleTypesPermissions.mockReturnValue({
      authorizedToCreateAnyRules: false,
    });

    return render(
      <IntlProvider>
        <RulesPage />
      </IntlProvider>
    );
  }

  it('renders a create rule button which is not disabled', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('createRuleButton')).toBeDisabled();
  });
});
